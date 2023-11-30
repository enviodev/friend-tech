/*
 *Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features*
 */
import {
  FriendtechSharesV1Contract_OwnershipTransferred_loader,
  FriendtechSharesV1Contract_OwnershipTransferred_handler,
  FriendtechSharesV1Contract_Trade_loader,
  FriendtechSharesV1Contract_Trade_handler,
} from "../generated/src/Handlers.gen";

import {
  OwnershipTransferredEntity,
  TradeEntity,
  EventsSummaryEntity,
  TraderEntity,
} from "./src/Types.gen";

const GLOBAL_EVENTS_SUMMARY_KEY = "GlobalEventsSummary";

const INITIAL_EVENTS_SUMMARY: EventsSummaryEntity = {
  id: GLOBAL_EVENTS_SUMMARY_KEY,
  ownershipTransferredsCount: BigInt(0),
  tradesCount: BigInt(0),
  totalBuys: BigInt(0),
  totalSells: BigInt(0),
};

const INITIAL_TRADER: TraderEntity = {
  id: "0x00000",
  numberOfTrades: BigInt(0),
  ethAmountFromBuys: BigInt(0),
  ethAmountFromSells: BigInt(0),
  totalBuys: BigInt(0),
  totalSells: BigInt(0),
  provisionalProfitOrLoss: BigInt(0),
};

FriendtechSharesV1Contract_OwnershipTransferred_loader(({ event, context }) => {
  context.EventsSummary.load(GLOBAL_EVENTS_SUMMARY_KEY);
});

FriendtechSharesV1Contract_OwnershipTransferred_handler(
  ({ event, context }) => {
    let summary = context.EventsSummary.get(GLOBAL_EVENTS_SUMMARY_KEY);

    let currentSummaryEntity: EventsSummaryEntity =
      summary ?? INITIAL_EVENTS_SUMMARY;

    let nextSummaryEntity = {
      ...currentSummaryEntity,
      ownershipTransferredsCount:
        currentSummaryEntity.ownershipTransferredsCount + BigInt(1),
    };

    let ownershipTransferredEntity: OwnershipTransferredEntity = {
      id: event.transactionHash + event.logIndex.toString(),
      previousOwner: event.params.previousOwner,
      newOwner: event.params.newOwner,
      eventsSummary: GLOBAL_EVENTS_SUMMARY_KEY,
    };

    context.EventsSummary.set(nextSummaryEntity);
    context.OwnershipTransferred.set(ownershipTransferredEntity);
  }
);

FriendtechSharesV1Contract_Trade_loader(({ event, context }) => {
  context.EventsSummary.load(GLOBAL_EVENTS_SUMMARY_KEY);
  context.Trader.load(event.params.trader.toString());
});

FriendtechSharesV1Contract_Trade_handler(({ event, context }) => {
  let summary = context.EventsSummary.get(GLOBAL_EVENTS_SUMMARY_KEY);

  let currentSummaryEntity: EventsSummaryEntity =
    summary ?? INITIAL_EVENTS_SUMMARY;

  let nextSummaryEntity = {
    ...currentSummaryEntity,
    tradesCount: currentSummaryEntity.tradesCount + BigInt(1),
    totalBuys: event.params.isBuy
      ? currentSummaryEntity.totalBuys + BigInt(1)
      : currentSummaryEntity.totalBuys,
    totalSells: !event.params.isBuy
      ? currentSummaryEntity.totalSells + BigInt(1)
      : currentSummaryEntity.totalSells,
  };

  let tradeEntity: TradeEntity = {
    id: event.transactionHash + event.logIndex.toString(),
    trader: event.params.trader,
    subject: event.params.subject,
    isBuy: event.params.isBuy,
    shareAmount: event.params.shareAmount,
    ethAmount: event.params.ethAmount,
    protocolEthAmount: event.params.protocolEthAmount,
    subjectEthAmount: event.params.subjectEthAmount,
    supply: event.params.supply,
    eventsSummary: GLOBAL_EVENTS_SUMMARY_KEY,
  };

  context.EventsSummary.set(nextSummaryEntity);
  context.Trade.set(tradeEntity);

  let trader = context.Trader.get(event.params.trader.toString());
  let TraderEntity: TraderEntity = trader ?? INITIAL_TRADER;

  let nextTraderEntity = {
    ...TraderEntity,
    id: event.params.trader.toString(),
    numberOfTrades: TraderEntity.numberOfTrades + BigInt(1),
    totalBuys: event.params.isBuy
      ? TraderEntity.totalBuys + BigInt(1)
      : TraderEntity.totalBuys,
    totalSells: !event.params.isBuy
      ? TraderEntity.totalSells + BigInt(1)
      : TraderEntity.totalSells,
    ethAmountFromBuys: event.params.isBuy
      ? TraderEntity.ethAmountFromBuys + event.params.ethAmount
      : TraderEntity.ethAmountFromBuys,
    ethAmountFromSells: !event.params.isBuy
      ? TraderEntity.ethAmountFromSells + event.params.ethAmount
      : TraderEntity.ethAmountFromSells,
    provisionalProfitOrLoss: event.params.isBuy
      ? TraderEntity.provisionalProfitOrLoss - event.params.ethAmount
      : TraderEntity.provisionalProfitOrLoss +
        (event.params.ethAmount * BigInt(9)) / BigInt(10), // take 10% fee into account.
  };

  context.Trader.set(nextTraderEntity);
});
