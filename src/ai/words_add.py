import sys
import json
from pathlib import Path

def add_words(json_path, new_words):
    path = Path(json_path)
    if not path.exists():
        words = []
    else:
        with open(path, 'r', encoding='utf-8') as f:
            words = json.load(f)
    # Добавляем новые слова, избегая дубликатов
    words_set = set(words)
    for word in new_words:
        words_set.add(word)
    # Сохраняем отсортированный список
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(sorted(words_set, key=str.lower), f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python words_add.py <json_path> word1 [word2 ...]')
        sys.exit(1)
    json_path = sys.argv[1]
    words = sys.argv[2:]
    add_words(json_path, words)
    print(f'Added {len(words)} word(s) to {json_path}') 