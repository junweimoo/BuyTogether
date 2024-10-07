package algorithm

import (
	"container/heap"
	"github.com/stretchr/testify/assert"
	"testing"
)

func TestPriorityQueue_Push_Pop(t *testing.T) {
	pq := make(PriorityQueue, 0)
	heap.Init(&pq)

	heap.Push(&pq, &UserAmountItem{netAmount: 1})
	heap.Push(&pq, &UserAmountItem{netAmount: 5})
	heap.Push(&pq, &UserAmountItem{netAmount: 3})
	heap.Push(&pq, &UserAmountItem{netAmount: 7})

	expectedOrder := []int{7, 5, 3, 1}
	for _, expectedAmt := range expectedOrder {
		item := heap.Pop(&pq).(*UserAmountItem)
		assert.Equal(t, item.netAmount, expectedAmt)
	}
}

func TestPriorityQueue_Update(t *testing.T) {
	pq := make(PriorityQueue, 0)
	heap.Init(&pq)

	itemToBeUpdated := &UserAmountItem{netAmount: 4}
	heap.Push(&pq, &UserAmountItem{netAmount: 1})
	heap.Push(&pq, &UserAmountItem{netAmount: 5})
	heap.Push(&pq, itemToBeUpdated)
	heap.Push(&pq, &UserAmountItem{netAmount: 7})
	pq.Update(itemToBeUpdated, itemToBeUpdated.userID, 3)

	expectedOrder := []int{7, 5, 3, 1}
	for _, expectedAmt := range expectedOrder {
		item := heap.Pop(&pq).(*UserAmountItem)
		assert.Equal(t, item.netAmount, expectedAmt)
	}
}
