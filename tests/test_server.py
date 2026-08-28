import unittest

import server


class OmenValidationTests(unittest.TestCase):
    def test_accepts_constrained_omen(self):
        result = server.validate_omen({"qian": "心灯未灭前路自开", "jie": "愿" * 70})
        self.assertEqual(result["qian"], "心灯未灭前路自开")

    def test_rejects_punctuation_in_qian(self):
        with self.assertRaises(server.OmenError) as captured:
            server.validate_omen({"qian": "心灯未灭，前路自开", "jie": "愿" * 70})
        self.assertEqual(captured.exception.code, "AI_INVALID_QIAN")

    def test_rejects_guarantees_in_interpretation(self):
        with self.assertRaises(server.OmenError) as captured:
            server.validate_omen({"qian": "心灯未灭前路自开", "jie": "愿" * 65 + "一定会" + "愿" * 10})
        self.assertEqual(captured.exception.code, "AI_UNSAFE_GUIDANCE")

    def test_requires_three_binary_choices(self):
        payload = {
            "wish": "我对前路很迷茫",
            "choices": [0, 1],
            "role": {"id": "path-general", "name": "开路将军", "duty": "开障引路", "reason": "测试", "kind": "traditional_reference"},
            "evidence": {"signs": ["山纹"]},
        }
        with self.assertRaises(server.OmenError) as captured:
            server.validate_input(payload)
        self.assertEqual(captured.exception.code, "INVALID_REQUEST")


if __name__ == "__main__":
    unittest.main()
