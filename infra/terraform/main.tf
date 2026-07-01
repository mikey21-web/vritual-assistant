# Production infrastructure - single-tenant per client
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.0" }
  }
}

provider "aws" { region = var.aws_region }

variable "aws_region" { default = "us-east-1" }
variable "client_name" { type = string }
variable "environment" { default = "production" }

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "${var.client_name}-vpc" }
}

resource "aws_subnet" "public" {
  count = 2
  vpc_id = aws_vpc.main.id
  cidr_block = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "${var.client_name}-public-${count.index}" }
}

data "aws_availability_zones" "available" { state = "available" }

resource "aws_ecs_cluster" "main" {
  name = "${var.client_name}-cluster"
  tags = { Client = var.client_name }
}

resource "aws_db_instance" "postgres" {
  identifier = "${var.client_name}-db"
  engine = "postgres"
  engine_version = "16"
  instance_class = "db.t4g.micro"
  allocated_storage = 20
  storage_encrypted = true
  db_name = "leadautomation"
  username = "postgres"
  password = random_password.db_password.result
  skip_final_snapshot = var.environment != "production"
  backup_retention_period = 30
  deletion_protection = var.environment == "production"
  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name = aws_db_subnet_group.main.name
}

resource "random_password" "db_password" { length = 24; special = false }
resource "aws_db_subnet_group" "main" {
  name = "${var.client_name}-db-subnets"
  subnet_ids = aws_subnet.public[*].id
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id = "${var.client_name}-redis"
  engine = "redis"
  node_type = "cache.t4g.micro"
  num_cache_nodes = 1
  parameter_group_name = "default.redis7"
  security_group_ids = [aws_security_group.redis.id]
  subnet_group_name = aws_elasticache_subnet_group.main.name
}

resource "aws_elasticache_subnet_group" "main" {
  name = "${var.client_name}-redis-subnets"
  subnet_ids = aws_subnet.public[*].id
}

resource "aws_security_group" "load_balancer" {
  name = "${var.client_name}-alb"
  vpc_id = aws_vpc.main.id
  ingress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"] }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "database" {
  name = "${var.client_name}-db"
  vpc_id = aws_vpc.main.id
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [aws_security_group.load_balancer.id] }
}

resource "aws_security_group" "redis" {
  name = "${var.client_name}-redis"
  vpc_id = aws_vpc.main.id
  ingress { from_port = 6379; to_port = 6379; protocol = "tcp"; security_groups = [aws_security_group.load_balancer.id] }
}

resource "aws_lb" "main" {
  name = "${var.client_name}-alb"
  internal = false
  load_balancer_type = "application"
  security_groups = [aws_security_group.load_balancer.id]
  subnets = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "backend" {
  name = "${var.client_name}-backend"
  port = 3001; protocol = "HTTP"; vpc_id = aws_vpc.main.id; target_type = "ip"
  health_check { path = "/health/ready"; interval = 30; timeout = 5; healthy_threshold = 2; unhealthy_threshold = 3 }
}

resource "aws_lb_target_group" "dashboard" {
  name = "${var.client_name}-dashboard"
  port = 3000; protocol = "HTTP"; vpc_id = aws_vpc.main.id; target_type = "ip"
  health_check { path = "/"; interval = 30; timeout = 5; healthy_threshold = 2; unhealthy_threshold = 3 }
}

resource "aws_s3_bucket" "backups" {
  bucket = "${var.client_name}-backups"
  tags = { Client = var.client_name }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

output "database_password" { value = random_password.db_password.result; sensitive = true }
output "alb_dns_name" { value = aws_lb.main.dns_name }
