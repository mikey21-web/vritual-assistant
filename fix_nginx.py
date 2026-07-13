import re

with open("/opt/lead-automation-demo/dashboard-v2/nginx.conf", "r") as f:
    content = f.read()

content = content.replace(
    "    location /api/ {",
    "    resolver 127.0.0.11 valid=5s;\n\n    location /api/ {"
)

old = '        proxy_pass http://backend:3001/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_read_timeout 30s;'

new = '        set $backend_upstream "http://backend:3001/";\n        proxy_pass $backend_upstream;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_read_timeout 30s;'

content = content.replace(old, new)

with open("/opt/lead-automation-demo/dashboard-v2/nginx.conf", "w") as f:
    f.write(content)

print("Fixed nginx.conf")
