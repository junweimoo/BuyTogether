package algorithm

import (
	"container/heap"
	"github.com/google/uuid"
)

type UserAmountItem struct {
	userID    uuid.UUID
	netAmount int
	index     int
}

type PriorityQueue []*UserAmountItem

func (pq PriorityQueue) Len() int {
	return len(pq)
}

func (pq PriorityQueue) Less(i, j int) bool {
	// max-heap (minimum netAmount element is popped first)
	return pq[i].netAmount > pq[j].netAmount
}

func (pq PriorityQueue) Swap(i, j int) {
	pq[i], pq[j] = pq[j], pq[i]
	pq[i].index = i
	pq[j].index = j
}

func (pq *PriorityQueue) Push(x interface{}) {
	n := len(*pq)
	item := x.(*UserAmountItem)
	item.index = n
	*pq = append(*pq, item)
}

func (pq *PriorityQueue) Pop() interface{} {
	old := *pq
	n := len(old)
	item := old[n-1]
	old[n-1] = nil
	item.index = -1
	*pq = old[0 : n-1]
	return item
}

func (pq *PriorityQueue) Update(item *UserAmountItem, value uuid.UUID, priority int) {
	item.userID = value
	item.netAmount = priority
	heap.Fix(pq, item.index)
}
