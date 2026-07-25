from __future__ import annotations

import unittest

from server.dev_api import DialogueQualityError, _validate_dialogue_quality


def request(history: list[dict[str, str]] | None = None) -> dict:
    return {
        "requested_turns": [
            {
                "expert_id": "agent-1",
                "expert_name": "孟宇轩",
            }
        ],
        "conversation_history": history or [],
    }


def result(text: str) -> dict:
    return {"turns": [{"text": text}]}


class DialogueQualityTests(unittest.TestCase):
    def test_rejects_control_instruction_leak(self) -> None:
        with self.assertRaises(DialogueQualityError):
            _validate_dialogue_quality(
                result("请继续围绕议题自然交流。碰瓷需要及时固定证据。"),
                request(),
            )

    def test_rejects_third_person_narration(self) -> None:
        with self.assertRaises(DialogueQualityError):
            _validate_dialogue_quality(
                result("桂兰婶对着孟宇轩讲：现场不能只谈技术。"),
                request(),
            )

    def test_rejects_exact_repeat_from_same_speaker(self) -> None:
        previous = "先报警并固定现场视频，再核对时间、位置和证人信息。"
        with self.assertRaises(DialogueQualityError):
            _validate_dialogue_quality(
                result(previous),
                request([
                    {"role": "expert", "expert_id": "agent-1", "content": previous},
                ]),
            )

    def test_allows_new_argument_from_same_speaker(self) -> None:
        _validate_dialogue_quality(
            result("除了录像，还要尽快记录车辆位置、接触点和在场证人的联系方式。"),
            request([
                {
                    "role": "expert",
                    "expert_id": "agent-1",
                    "content": "先报警并固定现场视频，再核对时间、位置和证人信息。",
                },
            ]),
        )

    def test_rejects_reused_opening_clause_from_other_speaker(self) -> None:
        with self.assertRaises(DialogueQualityError):
            _validate_dialogue_quality(
                result("碰瓷的人哪会跟你讲道理？关键是谁先怕、谁先软。"),
                {
                    **request([
                        {
                            "role": "expert",
                            "expert_id": "agent-2",
                            "content": "光讲定义没有用，关键是谁先怕、谁先软。",
                        },
                    ]),
                    "phase": "stance",
                },
            )

    def test_rejects_reused_argument_skeleton_from_same_speaker(self) -> None:
        with self.assertRaises(DialogueQualityError):
            _validate_dialogue_quality(
                result(
                    "周桂兰，现场决策树必须先跑通。第一步要快速确认伤者状态、固定目击者、同步报警。"
                ),
                {
                    **request([
                        {
                            "role": "expert",
                            "expert_id": "agent-1",
                            "content": "高风险现场要把决策树前置，先确认伤者状态、固定目击者、同步报警，再细化证据。",
                        },
                    ]),
                    "phase": "rebuttal",
                },
            )


if __name__ == "__main__":
    unittest.main()
