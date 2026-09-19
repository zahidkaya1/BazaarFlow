package com.zahidkaya.bazaarflow

import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    val contentView = findViewById<View>(android.R.id.content)

    // BazaarFlow açık renk arayüz kullandığı için sistem bar ikonlarını koyu tut.
    WindowInsetsControllerCompat(window, window.decorView).apply {
      isAppearanceLightStatusBars = true
      isAppearanceLightNavigationBars = true
    }

    // Android 15+ edge-to-edge davranışında Tauri WebView sistem barlarının altına
    // çizilebilir. Gerçek cihaz insetlerini native tarafta içerik köküne uyguluyoruz.
    ViewCompat.setOnApplyWindowInsetsListener(contentView) { view, windowInsets ->
      val systemBarTypes =
        WindowInsetsCompat.Type.statusBars() or
          WindowInsetsCompat.Type.navigationBars() or
          WindowInsetsCompat.Type.displayCutout()

      val safeInsets = windowInsets.getInsets(systemBarTypes)

      view.setPadding(
        safeInsets.left,
        safeInsets.top,
        safeInsets.right,
        safeInsets.bottom,
      )

      // WebView artık native olarak güvenli alana taşındı. Aynı status/navigation
      // insetlerini CSS env(safe-area-inset-*) üzerinden ikinci kez uygulamasın.
      // IME (klavye) insetleri ise korunur; adjustResize çalışmaya devam eder.
      WindowInsetsCompat.Builder(windowInsets)
        .setInsets(systemBarTypes, Insets.NONE)
        .build()
    }

    ViewCompat.requestApplyInsets(contentView)
  }
}
