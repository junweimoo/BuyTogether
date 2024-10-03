package algorithm

import "backend/models"

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
