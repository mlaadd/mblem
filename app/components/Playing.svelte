<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { alert, Application } from "@nativescript/core";
  import { goBack } from "@nativescript-community/svelte-native";
  import { disconnect, write } from "~/ble";
  import { connected, gameState, selfHand, oppHand, topCard, cards, turn } from "~/gameState";
  import { canPlay, drawCount, keepsTurn, playDrawDelta } from "~/rules";
  import { CARD_BACK, cardToUnicode, isRed } from "~/cards";
  import { playMessage, PLAY_DRAW } from "~/protocol";

  const SEND_FAILED_MESSAGE = "Couldn't reach your opponent ~ the connection may be lost.";

  const playCard = async (card: number) => {
    if (!$turn) return;
    const played = $selfHand[card];
    if (!canPlay($topCard, played, gameState.drawAcc)) return;

    gameState.drawAcc += playDrawDelta(played);
    $cards.push($topCard);
    $topCard = $selfHand.splice(card, 1)[0];
    $selfHand = $selfHand;
    const sent = await write(playMessage(card));
    if (!sent) alert(SEND_FAILED_MESSAGE);
    if (keepsTurn(played)) return;
    $turn = false;
  };

  const drawCard = async () => {
    if (!$turn) return;
    const numToDraw = drawCount(gameState.drawAcc);
    gameState.drawAcc = 0;
    $turn = false;
    $selfHand.push(...$cards.splice(0, numToDraw));
    $cards = $cards;
    $selfHand = $selfHand;
    const sent = await write(playMessage(PLAY_DRAW));
    if (!sent) alert(SEND_FAILED_MESSAGE);
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

  onMount(() => {
    Application.android.on(Application.AndroidApplication.activityBackPressedEvent, onBackPressed);
  });

  onDestroy(() => {
    Application.android.off(Application.AndroidApplication.activityBackPressedEvent, onBackPressed);
  });
</script>

<page>
  <actionBar title="{$turn ? 'Your' : "Opponent's"} turn" />

  <gridLayout rows="auto,*,auto" columns="*" color="black">
    <scrollView orientation="horizontal" row="0" marginTop="20">
      <stackLayout orientation="horizontal" horizontalAlignment="center">
        {#each $oppHand as card, i (card)}
          <label
            text={CARD_BACK}
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
        <label text={CARD_BACK} fontSize="120" on:tap={drawCard} />
      </stackLayout>

      <stackLayout>
        <label text={cardToUnicode($topCard)} color={isRed($topCard) ? "firebrick" : "black"} fontSize="120" />
      </stackLayout>
    </stackLayout>

    <stackLayout
      row="2"
      orientation="vertical"
      horizontalAlignment="center"
      verticalAlignment="bottom"
      marginBottom="20"
    >
      {#each chunk($selfHand, 7) as handRow, rowIndex (rowIndex)}
        <stackLayout orientation="horizontal" horizontalAlignment="center" marginBottom="-30">
          {#each handRow as card, i (card)}
            <label
              text={cardToUnicode(card)}
              fontSize="120"
              style:margin-left={i ? "-30" : "0"}
              backgroundColor="white"
              margin="0"
              color={isRed(card) ? "firebrick" : "black"}
              on:tap={() => playCard($selfHand.indexOf(card))}
            />
          {/each}
        </stackLayout>
      {/each}
    </stackLayout>
  </gridLayout>
</page>
