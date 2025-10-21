import { decode } from "base-64"; // Більш надійний спосіб декодування Base64 в RN
import React, { FC, useState } from "react";
import {
  Button,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  Text,
  View,
} from "react-native";
import {
  BleError,
  BleManager, // Тип для помилок
  Characteristic,
  Device, // Тип для характеристики
  Service, // Тип для сервісу
} from "react-native-ble-plx";
import { LineChart } from "react-native-chart-kit";

// --- Типізація ---

// Описуємо, як виглядають дані, що приходять з датчика (після JSON.parse)
interface SensorPayload {
  level: number;
  liters: number;
}

// Описуємо, як виглядає запис даних, який ми зберігаємо у стані
interface SensorDataEntry extends SensorPayload {
  time: string;
}

// -------------------

const manager = new BleManager();
const DEVICE_NAME = "ESP32_WaterSensor";

// Типізуємо компонент як React.FC (Functional Component)
const App: FC = () => {
  // Типізуємо стани
  const [device, setDevice] = useState<Device | null>(null);
  const [data, setData] = useState<SensorDataEntry[]>([]);
  const [connected, setConnected] = useState<boolean>(false);

  const scanAndConnect = () => {
    manager.startDeviceScan(
      null,
      null,
      (error: BleError | null, dev: Device | null) => {
        // Явно типізуємо параметри колбеку
        if (error) return console.log(error);

        // Додаємо перевірку, що 'dev' існує
        if (dev && dev.name === DEVICE_NAME) {
          manager.stopDeviceScan();
          dev
            .connect()
            .then((d) => d.discoverAllServicesAndCharacteristics())
            .then((d) => {
              setDevice(d);
              setConnected(true);
              startNotifications(d);
            });
        }
      }
    );
  };

  // Явно типізуємо параметр 'dev'
  const startNotifications = async (dev: Device) => {
    const services: Service[] = await dev.services();
    for (const service of services) {
      const characteristics: Characteristic[] = await service.characteristics();
      for (const c of characteristics) {
        if (c.isNotifiable) {
          // Типізуємо параметри колбеку монітора
          c.monitor((error: BleError | null, char: Characteristic | null) => {
            // Більш надійна перевірка 'char' та 'char.value'
            if (char && char.value) {
              const decoded = decode(char.value); // Використовуємо decode
              try {
                // Вказуємо, що очікуємо отримати SensorPayload
                const json: SensorPayload = JSON.parse(decoded);
                addData(json);
              } catch (e) {
                console.log("Parse error:", e);
              }
            }
          });
        }
      }
    }
  };

  // Типізуємо вхідний 'json'
  const addData = (json: SensorPayload) => {
    const newEntry: SensorDataEntry = {
      time: new Date().toLocaleTimeString(),
      level: json.level,
      liters: json.liters,
    };
    // 'prev' автоматично наслідує тип стану (SensorDataEntry[])
    setData((prev) => {
      const updated = [...prev, newEntry];
      return updated.slice(-100);
    });
  };

  const levels: number[] = data.map((d) => d.level);
  const labels: string[] = data.map((d) => d.time).slice(-5);

  const avg = levels.length
    ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1)
    : 0;
  const min = levels.length ? Math.min(...levels).toFixed(1) : 0;
  const max = levels.length ? Math.max(...levels).toFixed(1) : 0;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Датчик рівня води
      </Text>
      {!connected && (
        <Button title="Підключитися до ESP32" onPress={scanAndConnect} />
      )}
      {connected && (
        <>
          <Text>Стан: Підключено</Text>
          <Text>
            Середній рівень: {avg}% | Мін: {min}% | Макс: {max}%
          </Text>
          <LineChart
            data={{
              labels: labels,
              datasets: [{ data: levels.slice(-5) }],
            }}
            width={Dimensions.get("window").width - 40}
            height={220}
            chartConfig={{
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              color: () => `#007AFF`,
              strokeWidth: 2,
            }}
          />
          <FlatList
            data={[...data].reverse()}
            keyExtractor={(item, i) => i.toString()}
            // Типізуємо 'item' з 'ListRenderItemInfo'
            renderItem={({ item }: ListRenderItemInfo<SensorDataEntry>) => (
              <Text>
                {item.time}: {item.level.toFixed(1)}% ({item.liters.toFixed(1)}{" "}
                л)
              </Text>
            )}
          />
        </>
      )}
    </View>
  );
};

export default App;
