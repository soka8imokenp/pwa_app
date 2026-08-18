package com.kairo.planner;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        try {
            // Force dark icons for status bar (time, battery, wifi) and navigation bar (home/back buttons)
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(true);
                controller.setAppearanceLightNavigationBars(true);
            }
            getWindow().setStatusBarColor(android.graphics.Color.parseColor("#FAF7F2"));
            getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#FAF7F2"));
        } catch (Exception ignored) {
        }
    }
}
