package algorithm

import (
	"backend/models"
	"container/heap"
	"github.com/google/uuid"
)

type Simplifier struct {
}

func (s *Simplifier) SimplifyItems(items []models.Item) []models.SimplifiedItem {
	var res []models.SimplifiedItem
	for _, item := range items {
		simplifiedItem := models.SimplifiedItem{
			RoomID:     item.RoomID,
			Amount:     item.Amount,
			FromUserID: item.FromUserID,
			ToUserID:   item.ToUserID,
		}
		res = append(res, simplifiedItem)
	}
	return res
}

func (s *Simplifier) greedyAlgorithm(items []models.Item) []models.SimplifiedItem {
	balances := map[uuid.UUID]int{}
	for _, item := range items {
		balances[item.FromUserID] -= item.Amount // debtor
		balances[item.ToUserID] += item.Amount   // creditor
	}

	debitpq := make(PriorityQueue, 0)
	heap.Init(&debitpq)
	creditpq := make(PriorityQueue, 0)
	heap.Init(&creditpq)

	for userID, balance := range balances {
		if balance < 0 {
			heap.Push(&debitpq, &UserAmountItem{userID: userID, netAmount: -balance})
		} else {
			heap.Push(&creditpq, &UserAmountItem{userID: userID, netAmount: balance})
		}
	}

	roomID := items[0].RoomID

	var res []models.SimplifiedItem
	for creditpq.Len() > 0 && debitpq.Len() > 0 {
		maxDebitItem := heap.Pop(&debitpq).(*UserAmountItem)
		maxCreditItem := heap.Pop(&creditpq).(*UserAmountItem)

		transferAmount := min(maxDebitItem.netAmount, maxCreditItem.netAmount)

		maxDebitItem.netAmount -= transferAmount
		maxCreditItem.netAmount -= transferAmount

		if maxDebitItem.netAmount > 0 {
			heap.Push(&debitpq, maxDebitItem)
		}
		if maxCreditItem.netAmount > 0 {
			heap.Push(&creditpq, maxCreditItem)
		}

		res = append(res, models.SimplifiedItem{
			RoomID:     roomID,
			Amount:     transferAmount,
			FromUserID: maxDebitItem.userID,
			ToUserID:   maxCreditItem.userID,
		})
	}

	return res
}
