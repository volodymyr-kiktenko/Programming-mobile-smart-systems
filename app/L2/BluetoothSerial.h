#include "BluetoothSerial.h"

BluetoothSerial SerialBT;

const char* DEVICE_NAME = "ESP32_WaterSensor";  // Унікальне ім’я
const int SENSOR_PIN = 34;  // аналоговий пін (можна замінити)
const int MAX_ADC = 4095;   // 12-бітний ADC
const int MAX_LITERS = 100; // умовно 100 л = 100%

unsigned long lastSend = 0;
int interval = 2000; // 2 секунди

void setup() {
  Serial.begin(115200);
  SerialBT.begin(DEVICE_NAME);
  Serial.println("Bluetooth Started. Waiting for connection...");
}

void loop() {
  // Генерація даних сенсора
  int rawValue = analogRead(SENSOR_PIN);
  float levelPercent = (rawValue / (float)MAX_ADC) * 100.0;
  float liters = (levelPercent / 100.0) * MAX_LITERS;

  // Формування JSON
  String jsonData = "{\"level\": ";
  jsonData += String(levelPercent, 2);
  jsonData += ", \"liters\": ";
  jsonData += String(liters, 1);
  jsonData += "}";

  // Передача через Bluetooth кожні N секунд
  if (millis() - lastSend > interval) {
    SerialBT.println(jsonData);
    Serial.println("Sent: " + jsonData);
    lastSend = millis();
  }

  // Прийом команд з телефону (для двостороннього зв'язку)
  if (SerialBT.available()) {
    String command = SerialBT.readStringUntil('\n');
    command.trim();

    if (command.startsWith("SET_INTERVAL")) {
      int newInt = command.substring(12).toInt();
      if (newInt >= 1000 && newInt <= 10000) {
        interval = newInt;
        SerialBT.println("ACK: Interval set to " + String(interval));
      } else {
        SerialBT.println("ERR: Invalid interval");
      }
    }
  }
}
