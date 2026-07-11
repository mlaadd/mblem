<script lang="ts">
  import { alert, Application } from "@nativescript/core";
  import { goBack } from "@nativescript-community/svelte-native";
  import { disconnect, write } from "~/ble";
  import { connected, gameState, selfHand, oppHand, topCard, cards, turn } from "~/gameState";

  const unicodeOffset = 0x1f0a0;

  const playCard = async (card: number) => {
    if ($turn) {
      if (($topCard & 0xf0) == ($selfHand[card] & 0xf0) || ($topCard & 0xf) == ($selfHand[card] & 0xf)) {
        if (($topCard & 0xf) === 0x7 && ($selfHand[card] & 0xf) !== 7 && gameState.drawAcc > 0) {
          return;
        }
        if (($selfHand[card] & 0xf) === 7) {
          gameState.drawAcc += 2;
        }
        $cards.push($topCard);
        $topCard = $selfHand.splice(card, 1)[0];
        $selfHand = $selfHand;
        await write("PLAY:" + card);
        if (($topCard & 0xf) === 0x1) return;
        $turn = false;
      }
    }
  };

  const drawCard = async () => {
    if ($turn) {
      const numToDraw = Math.max(gameState.drawAcc, 1);
      gameState.drawAcc = 0;
      $turn = false;
      $selfHand.push(...$cards.splice(0, numToDraw));
      $cards = $cards;
      $selfHand = $selfHand;
      await write("PLAY:-1");
    }
  };

  $: {
    if ($selfHand.length < 1) {
      disconnect();
      alert("You won!");
      goBack();
    } else if ($oppHand.length < 1) {
      disconnect();
      alert("You lost!");
      goBack();
    } else if (!$connected) {
      goBack();
      if (!gameState.gaveup) alert("Your opponent disconnected.");
      gameState.gaveup = true;
    }
  }

  const getUnicode = (id: number) => {
    return String.fromCodePoint(id + unicodeOffset);
  };

  function chunk(array: Array<number>, size: number) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  function onBackPressed() {
    gameState.gaveup = true;
    disconnect();
  }

  Application.android.on(Application.AndroidApplication.activityBackPressedEvent, onBackPressed);
</script>

<page>
  <actionBar title="{$turn ? 'Your' : "Opponent's"} turn" />

  <gridLayout rows="auto,*,auto" columns="*" color="black">
    <scrollView orientation="horizontal" row="0" marginTop="20">
      <stackLayout orientation="horizontal" horizontalAlignment="center">
        {#each $oppHand as card, i (card)}
          <label
            text={getUnicode(0)}
            fontSize="120"
            style:margin-left={i ? "-50" : "0"}
            backgroundColor="white"
            textWrap="false"
          />
        {/each}
      </stackLayout>
    </scrollView>

    <stackLayout row="1" orientation="horizontal" horizontalAlignment="center">
      <stackLayout>
        <label text={getUnicode(0)} fontSize="120" on:tap={drawCard} />
      </stackLayout>

      <stackLayout>
        <label
          text={getUnicode($topCard)}
          color={($topCard & 0xf0) === 0x10 || ($topCard & 0xf0) === 0x20 ? "firebrick" : "black"}
          fontSize="120"
        />
      </stackLayout>
    </stackLayout>

    <stackLayout
      row="2"
      orientation="vertical"
      horizontalAlignment="center"
      verticalAlignment="bottom"
      marginBottom="20"
    >
      {#each chunk($selfHand, 7) as handRow (handRow)}
        <stackLayout orientation="horizontal" horizontalAlignment="center" marginBottom="-30">
          {#each handRow as card, i (card)}
            <label
              text={getUnicode(card)}
              fontSize="120"
              style:margin-left={i ? "-30" : "0"}
              backgroundColor="white"
              margin="0"
              color={(card & 0xf0) === 0x10 || (card & 0xf0) === 0x20 ? "firebrick" : "black"}
              on:tap={() => playCard($selfHand.indexOf(card))}
            />
          {/each}
        </stackLayout>
      {/each}
    </stackLayout>
  </gridLayout>
</page>
