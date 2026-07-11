<script lang="ts">
  import { toggleAdvertising } from "~/blePeripheral";
  import { scanAndConnect, searchConnection } from "~/ble";
  import { ready } from "~/gameState";
  import { navigate } from "@nativescript-community/svelte-native";
  import Playing from "./Playing.svelte";

  $: {
    if ($ready) {
      startGame();
    }
  }

  const startGame = (): void => {
    navigate({ page: Playing });
  };

  const scan = async () => {
    toggleAdvertising(true, 10);
    scanAndConnect();
  };
</script>

<page>
  <actionBar title="Menu" />
  <gridLayout columns="2*" rows="2*, 2*, 2*">
    <label class="info" row="0" textWrap="true" style="text-align:center">
      <formattedString>
        <span class="fas" text="&#x1F0CF;" />
        <span text="ᛖ" />
        <span text="ᛒLE" color="#0082FC" />
        <span text="ᛖ" />
        <span text="\n" />
        <span text="\n" fontSize="15" />
        <span text="Mau-Mau over Bluetooth Low Energy" fontSize="20" />
      </formattedString>
    </label>
    <button text="Connect with player" row="1" on:tap={scan} isEnabled={!$searchConnection}></button>
    <label
      class="info"
      style="font-size: 20;"
      row="2"
      text={$searchConnection
        ? $ready
          ? "Player found, Game starts now!"
          : "Searching for player..."
        : "Tap button to start search."}
    ></label>
  </gridLayout>
</page>

<style>
  .info .fas {
    color: #3a53ff;
  }

  .info {
    font-size: 60;
    horizontal-align: center;
    vertical-align: center;
  }
</style>
