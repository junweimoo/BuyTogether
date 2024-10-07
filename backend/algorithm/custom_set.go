package algorithm

type Set map[string]struct{}

func (s Set) Add(element string) {
	s[element] = struct{}{}
}

func (s Set) Remove(element string) {
	delete(s, element)
}

func (s Set) Contains(element string) bool {
	_, exists := s[element]
	return exists
}

func (s Set) Size() int {
	return len(s)
}
