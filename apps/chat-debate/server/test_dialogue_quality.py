from __future__ import annotations

import unittest
from unittest.mock import patch

import httpx

from server.dev_api import DialogueQualityError, _validate_dialogue_quality
from server.roundtable_core.ai_provider import PixelAIProvider
from server.roundtable_core.config import Settings
from server.roundtable_core.errors import APIError


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

    def test_allows_shared_short_clause_from_other_speaker(self) -> None:
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

    def test_rejects_reused_long_clause_from_other_speaker(self) -> None:
        with self.assertRaises(DialogueQualityError):
            _validate_dialogue_quality(
                result("先稳住现场，先确认伤者状态、固定目击者、同步报警，再讨论责任。"),
                {
                    **request([
                        {
                            "role": "expert",
                            "expert_id": "agent-2",
                            "content": "不要急着争论，先确认伤者状态、固定目击者、同步报警，再核对车辆位置。",
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

    def test_allows_shared_fact_premise_with_new_rebuttal_conclusion(self) -> None:
        _validate_dialogue_quality(
            result("我理解你的担心，不过必须先核对时间地点和完整视频，再讨论责任比例。"),
            {
                **request([
                    {
                        "role": "expert",
                        "expert_id": "agent-1",
                        "content": "这件事不能凭感觉，必须先核对时间地点和完整视频。",
                    },
                ]),
                "phase": "rebuttal",
            },
        )


class TimeoutClient:
    async def __aenter__(self) -> TimeoutClient:
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def post(self, *_args: object, **_kwargs: object) -> None:
        request = httpx.Request("POST", "https://api.example.test/chat/completions")
        raise httpx.ReadTimeout("timed out", request=request)


class ProviderErrorTests(unittest.IsolatedAsyncioTestCase):
    async def test_maps_http_timeout_to_api_error(self) -> None:
        provider = PixelAIProvider(Settings(
            ai_chat_provider="opencode_go",
            opencode_go_api_key="test-key",
            opencode_go_chat_url="https://api.example.test",
            opencode_go_chat_model="test-model",
        ))
        with patch("server.roundtable_core.ai_provider.httpx.AsyncClient", return_value=TimeoutClient()):
            with self.assertRaises(APIError) as captured:
                await provider._chat(
                    system_prompt="system",
                    user_prompt="user",
                    max_tokens=32,
                    temperature=0.2,
                )

        self.assertEqual(captured.exception.status_code, 504)
        self.assertEqual(captured.exception.code, "upstream_timeout")


if __name__ == "__main__":
    unittest.main()
