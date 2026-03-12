import { AndroidActivityRequestPermissionsEventData, Application, Utils, alert } from "@nativescript/core";
import { Bluetooth } from "@nativescript-community/ble";
import { request, check } from "@nativescript-community/perms";

const ble = new Bluetooth();

export async function enableBluetooth() {
  const bluetoothPermission = android.Manifest.permission.BLUETOOTH_CONNECT;
  const bluetoothScanPermission = android.Manifest.permission.BLUETOOTH_SCAN;
  const locationPermission = android.Manifest.permission.ACCESS_FINE_LOCATION;

  const bluetoothGranted = await check(bluetoothPermission);
  if (bluetoothGranted !== "authorized") {
    await request("bluetoothConnect", { type: "always" });
  }

  const bluetoothScanGranted = await check(bluetoothScanPermission);
  if (bluetoothScanGranted !== "authorized") {
    await request("bluetoothScan", { type: "always" });
  }

  const locationGranted = await check(locationPermission);
  if (locationGranted !== "authorized") {
    await request("location");
  }

  const advertiseGranted = await requestBluetoothAdvertisePermission();
  if (!advertiseGranted) {
    console.log("Bluetooth advertising permission denied.");
    return;
  }

  console.log("Permissions granted:", bluetoothGranted, bluetoothScanGranted, locationGranted);

  if (bluetoothGranted === "authorized" && bluetoothScanGranted === "authorized" && locationGranted === "authorized") {
    try {
      const enabled = await ble.enable();
      if (enabled) {
        console.log("Bluetooth is enabled.");
        const locationServicesEnabled = isLocationEnabled();
        if (!locationServicesEnabled) {
          await alert("Location services must be enabled for Bluetooth scanning.");
          openLocationSettings();

          return;
        }
      } else {
        console.log("Bluetooth is not enabled.");
      }
    } catch (error) {
      console.log("Error enabling Bluetooth:", error);
    }
  } else {
    console.log("Permissions denied. Cannot proceed with scanning.");
  }
}

function isLocationEnabled() {
  const context = Utils.android.getApplicationContext();
  const locationManager = context.getSystemService(android.content.Context.LOCATION_SERVICE);
  const gpsEnabled = locationManager.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);
  const networkEnabled = locationManager.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER);
  return gpsEnabled || networkEnabled;
}

function openLocationSettings() {
  const intent = new android.content.Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS);
  intent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
  Utils.android.getApplicationContext().startActivity(intent);
}

// @nativescript-community/perms doesn't implement bluetoothAdvertise, so we need to request it through native calls
async function requestBluetoothAdvertisePermission(): Promise<boolean> {
  const REQUEST_BT_ADVERTISE = 2001;

  const activity = Application.android.foregroundActivity || Application.android.startActivity;

  const permission = android.Manifest.permission.BLUETOOTH_ADVERTISE;

  const granted =
    androidx.core.content.ContextCompat.checkSelfPermission(activity, permission) ===
    android.content.pm.PackageManager.PERMISSION_GRANTED;

  if (granted) {
    return true;
  }

  return new Promise((resolve) => {
    const callback = (args: AndroidActivityRequestPermissionsEventData) => {
      if (args.requestCode === REQUEST_BT_ADVERTISE) {
        Application.android.off(Application.AndroidApplication.activityRequestPermissionsEvent, callback);

        const granted =
          args.grantResults.length > 0 && args.grantResults[0] === android.content.pm.PackageManager.PERMISSION_GRANTED;

        resolve(granted);
      }
    };

    Application.android.on(Application.AndroidApplication.activityRequestPermissionsEvent, callback);

    androidx.core.app.ActivityCompat.requestPermissions(activity, [permission], REQUEST_BT_ADVERTISE);
  });
}
