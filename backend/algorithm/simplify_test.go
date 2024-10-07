package algorithm

import (
	"backend/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"sort"
	"testing"
)

func TestSimplifier_greedyAlgorithm(t *testing.T) {
	s := Simplifier{}

	var uids [3]uuid.UUID
	uidLookup := make(map[uuid.UUID]int)
	for i := 0; i < 3; i++ {
		uids[i] = uuid.New()
		uidLookup[uids[i]] = i
	}

	items := []models.Item{
		{FromUserID: uids[0], ToUserID: uids[1], Amount: 10},
		{FromUserID: uids[0], ToUserID: uids[2], Amount: 20},
		{FromUserID: uids[1], ToUserID: uids[2], Amount: 50},
	}

	expectedAmounts := []int{30, 40}
	actualAmounts := []int{}

	simplifiedItems := s.greedyAlgorithm(items)
	for _, item := range simplifiedItems {
		actualAmounts = append(actualAmounts, item.Amount)
		//log.Println(item.Amount, "From user:", uidLookup[item.FromUserID], "To user:", uidLookup[item.ToUserID])
	}

	sort.Ints(actualAmounts)
	sort.Ints(expectedAmounts)
	assert.ElementsMatch(t, expectedAmounts, actualAmounts)
}
