#!/bin/bash

# App Store Screenshot Script für TVS Jugendtrainer
# Erstellt Screenshots auf verschiedenen Simulatoren

SCREENSHOT_DIR="$HOME/Desktop/AppStore-Screenshots"
mkdir -p "$SCREENSHOT_DIR"

echo "📱 App Store Screenshot Tool"
echo "============================"
echo ""
echo "Die App sollte bereits im Simulator laufen."
echo "Navigiere manuell zum gewünschten Screen und drücke Enter."
echo ""

# Funktion zum Screenshot machen
take_screenshot() {
    local device_name=$1
    local screen_name=$2
    local filename="${device_name// /_}_${screen_name}.png"
    
    xcrun simctl io booted screenshot "$SCREENSHOT_DIR/$filename"
    echo "✅ Screenshot gespeichert: $filename"
}

# Geräte für App Store
# 6.7" - iPhone 15 Pro Max (1290 x 2796)
# 6.5" - iPhone 14 Plus (1284 x 2778)  
# 5.5" - iPhone 8 Plus (1242 x 2208)
# iPad Pro 12.9" (2048 x 2732)

echo "Aktuelle Simulatoren:"
xcrun simctl list devices | grep -E "Booted"
echo ""

# Screenshots für verschiedene Screens
screens=("1_Startscreen" "2_Login" "3_Turniere" "4_Turnier_Detail" "5_Spiel_Live")

for screen in "${screens[@]}"; do
    echo ""
    echo "📸 Nächster Screenshot: $screen"
    read -p "Navigiere zum Screen und drücke Enter... "
    take_screenshot "current_device" "$screen"
done

echo ""
echo "🎉 Fertig! Screenshots gespeichert in: $SCREENSHOT_DIR"
echo ""
echo "Für verschiedene Gerätegrößen:"
echo "1. Öffne Simulator → File → Open Simulator → Wähle anderes Gerät"
echo "2. Warte bis die App lädt"
echo "3. Führe das Script erneut aus"

