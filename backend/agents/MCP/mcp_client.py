# mcp_client.py
import asyncio
from pydantic import AnyUrl
from mcp import ClientSession, StdioServerParameters, types
from mcp.client.stdio import stdio_client

async def main():
    # Tell the client how to launch your server
    server_params = StdioServerParameters(
        command="python",
        args=["mcp_server.py"],   # path to your server file
        env=None,                 # or dict of env vars
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Call the "add" tool
            add_result = await session.call_tool("add", {"a": 3, "b": 5})
            # Unstructured text is in .content[0], structured (if any) in .structuredContent
            if add_result.content and isinstance(add_result.content[0], types.TextContent):
                print("add ->", add_result.content[0].text)
            if add_result.structuredContent is not None:
                print("add (structured) ->", add_result.structuredContent)

            # Read the resource
            res = await session.read_resource(AnyUrl("greeting://Alice"))
            if res.contents and isinstance(res.contents[0], types.TextContent):
                print("resource ->", res.contents[0].text)

            # Get the prompt
            prompt = await session.get_prompt("greet_user", {"name": "Alice", "style": "formal"})
            # Prompts return message blocks
            msg0 = prompt.messages[0].content[0]
            if isinstance(msg0, types.TextContent):
                print("prompt ->", msg0.text)

if __name__ == "__main__":
    asyncio.run(main())

