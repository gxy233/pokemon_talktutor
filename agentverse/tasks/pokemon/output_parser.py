'''

这段 Python 代码定义了一个名为 `PokemonParser` 的类，该类继承自 `OutputParser`，似乎是为了解析某种输出格式（可能与游戏或模拟有关）。以下是对这段代码的详细解释：

1. **导入**:
   - `__future__` 的导入使得某些 Python 3.7 之后的特性在早期版本中可用。
   - 导入了正则表达式、JSON处理以及类型注释相关的模块和类。

2. **装饰器**:
   - `@output_parser_registry.register("pokemon")` 这个装饰器似乎将 `PokemonParser` 类注册到某种输出解析器注册表中，并与 `"pokemon"` 这个标识关联。

3. **类定义 - `PokemonParser`**:
   - 该类只定义了一个 `parse` 方法，用于解析传入的 `output`，该 `output` 似乎是 `LLMResult` 类型的一个实例。
   
4. **方法定义 - `parse`**:
   - 首先，它从 `output` 中获取文本内容。
   - 使用正则表达式进行清理，移除多余的换行符。
   - 检查清理后的输出是否具有特定的格式（包含“Thought:”，“Action:”和“Action Input:”等前缀）。
   - 如果输出不满足预期格式，它将引发一个错误。
   - 从输出中提取 "Action" 和 "Action Input" 的值。
   - 尝试将 "Action Input" 的值解析为 JSON，并将 "Action" 添加到该 JSON 对象中。
   - 最后，返回一个 `AgentFinish` 实例，其中包含解析后的内容。

总的来说，`PokemonParser` 类的目的是解析特定格式的文本输出，该输出似乎包含某种代理或模拟的思考、行动和输入。当输出不满足预期格式或不可解析时，该类会引发错误。
'''


from __future__ import annotations

import re
import json
from typing import Union

from agentverse.parser import OutputParser, LLMResult

# from langchain.schema import AgentAction, AgentFinish
from agentverse.utils import AgentAction, AgentFinish

from agentverse.parser import OutputParserError, output_parser_registry


@output_parser_registry.register("pokemon")
class PokemonParser(OutputParser):
    def parse(self, output: LLMResult) -> Union[AgentAction, AgentFinish]:
        text = output.content
        cleaned_output = text.strip()
        cleaned_output = re.sub(r"\n+", "\n", cleaned_output)
        cleaned_output = cleaned_output.split("\n")
        if not (
            len(cleaned_output) == 3
            and cleaned_output[0].startswith("Thought:")
            and cleaned_output[1].startswith("Action:")
            and cleaned_output[2].startswith("Action Input:")
        ):
            raise OutputParserError(text)
        action = cleaned_output[1][len("Action:") :].strip()
        action_input = cleaned_output[2][len("Action Input:") :].strip()
        try:
            action_input = json.loads(action_input)
        except json.JSONDecodeError:
            raise OutputParserError(text)
        action_input["action"] = action
        return AgentFinish({"output": json.dumps(action_input)}, text)
