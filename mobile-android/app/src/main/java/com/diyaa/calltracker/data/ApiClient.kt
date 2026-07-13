package com.diyaa.calltracker.data

import com.diyaa.calltracker.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

// A single API client for the whole app: the device's x-api-key is attached to every
// request once paired. Pairing itself doesn't need the key (it's what pairing produces).
object ApiClient {
    @Volatile private var storage: SecureStorage? = null

    fun init(secureStorage: SecureStorage) {
        storage = secureStorage
    }

    val api: CallTrackingApi by lazy {
        val authInterceptor = Interceptor { chain ->
            val key = storage?.apiKey
            val request = if (key != null) {
                chain.request().newBuilder().addHeader("x-api-key", key).build()
            } else {
                chain.request()
            }
            chain.proceed(request)
        }

        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()

        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CallTrackingApi::class.java)
    }
}
