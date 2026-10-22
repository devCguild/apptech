import unittest

import random

from generate_quiz import build_bank, clean_choice, parse_verdicts, validate_question


def good(**kw):
    q = {
        "question": "수요가 늘고 공급이 그대로면 가격은?",
        "choices": ["오른다", "내린다", "그대로", "알 수 없다"],
        "answer": 0,
        "explanation": "수요 증가는 가격 상승 압력이다.",
    }
    q.update(kw)
    return q


class ValidateTest(unittest.TestCase):
    def test_valid_question_passes(self):
        self.assertTrue(validate_question(good(answer=2)))

    def test_rejects_wrong_choice_count(self):
        self.assertFalse(validate_question(good(choices=["a", "b", "c"])))

    def test_rejects_answer_out_of_range(self):
        self.assertFalse(validate_question(good(answer=4)))

    def test_rejects_duplicate_choices(self):
        self.assertFalse(validate_question(good(choices=["a", "a", "b", "c"])))

    def test_rejects_empty_question(self):
        self.assertFalse(validate_question(good(question="  ")))


class BuildBankTest(unittest.TestCase):
    def test_assigns_ids_and_drops_invalid(self):
        raw = {"economy": [good(), good(answer=9), good(question="인플레이션이란?", answer=1)]}
        bank = build_bank(raw, "2026-10-22", random.Random(0))
        self.assertEqual(bank["generatedAt"], "2026-10-22")
        self.assertEqual([i["id"] for i in bank["items"]], ["economy-1", "economy-2"])
        self.assertEqual(bank["items"][0]["category"], "economy")


class CleanTest(unittest.TestCase):
    def test_strips_choice_prefixes(self):
        for raw in ["a. 오른다", "B) 오른다", "3. 오른다", "(c) 오른다", "오른다"]:
            self.assertEqual(clean_choice(raw), "오른다")

    def test_keeps_real_words(self):
        self.assertEqual(clean_choice("a lot"), "a lot")
        self.assertEqual(clean_choice("1919년"), "1919년")

    def test_rejects_choices_identical_after_prefix_strip(self):
        q = good(choices=["a) performance", "b) performance", "c) performance", "d) performance"])
        self.assertFalse(validate_question(q))


class BankQualityTest(unittest.TestCase):
    def test_build_bank_strips_prefix_and_keeps_answer_text(self):
        q = good(choices=["a. 오른다", "b. 내린다", "c. 그대로", "d. 모른다"], answer=1)
        item = build_bank({"economy": [q]}, "2026-10-22", random.Random(0))["items"][0]
        self.assertEqual(item["choices"][item["answer"]], "내린다")
        self.assertCountEqual(item["choices"], ["오른다", "내린다", "그대로", "모른다"])

    def test_build_bank_spreads_answer_positions(self):
        raws = [good(question=f"문제 {n}", answer=0) for n in range(40)]
        items = build_bank({"economy": raws}, "2026-10-22", random.Random(1))["items"]
        positions = {i["answer"] for i in items}
        self.assertEqual(positions, {0, 1, 2, 3})


class VerdictTest(unittest.TestCase):
    def test_parse_verdicts(self):
        text = '설명 {"results":[{"i":0,"ok":true},{"i":1,"ok":false},{"i":2,"ok":true}]}'
        self.assertEqual(parse_verdicts(text, 3), [True, False, True])

    def test_missing_verdict_means_rejected(self):
        self.assertEqual(parse_verdicts('{"results":[{"i":0,"ok":true}]}', 2), [True, False])

    def test_garbage_returns_none(self):
        self.assertIsNone(parse_verdicts("죄송합니다", 2))


if __name__ == "__main__":
    unittest.main()
