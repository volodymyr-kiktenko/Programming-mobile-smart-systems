import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  const [location, setLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [speed, setSpeed] = useState(0);
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [status, setStatus] = useState("Визначення...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Дозвіл на доступ до локації не надано");
        return;
      }

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 1 },
        (pos) => {
          setLocation(pos.coords);
          setSpeed(pos.coords.speed || 0);
        }
      );

      Accelerometer.setUpdateInterval(500);
      const sub = Accelerometer.addListener((acc) => setAcceleration(acc));
      return () => sub && sub.remove();
    })();
  }, []);

  useEffect(() => {
    const totalAccel = Math.sqrt(
      acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2
    );

    // Якщо швидкість < 0.5 м/с і прискорення стабільне → стоїть
    if (speed < 0.5 && Math.abs(totalAccel - 1) < 0.05) {
      setStatus("🚦 Пристрій нерухомий");
    } else {
      setStatus("🏃 Рухається");
    }
  }, [speed, acceleration]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Детектор зупинки</Text>
      {errorMsg ? <Text>{errorMsg}</Text> : null}
      <Text>Швидкість: {speed.toFixed(2)} м/с</Text>
      <Text>
        Акселерометр: x={acceleration.x.toFixed(2)}, y=
        {acceleration.y.toFixed(2)}, z={acceleration.z.toFixed(2)}
      </Text>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  status: {
    fontSize: 22,
    marginTop: 30,
    color: "#007AFF",
  },
});
