<h1 align="center"> 🤖 pokemon_talktutor 🪐 </h1>

<h3 align="center">
    <p>Talk to the Pokémon characters</p>
</h3>
<p align="center">
    <a href="https://github.com/OpenBMB/AgentVerse/blob/main/LICENSE">
        <img alt="License: Apache2" src="https://img.shields.io/badge/License-Apache_2.0-green.svg">
    </a>
    <a href="https://www.python.org/downloads/release/python-3916/">
        <img alt="Documentation" src="https://img.shields.io/badge/python-3.9+-blue.svg">
    </a>
</p>


<p align="center">
    【English | <a href="README_zh.md">Chinese</a>】
</p>

**pokemon_talktutor** is an extension of **Agentverse** 

---

## 👾 Simple Demo Video

We demonstrate the following cases.

<!--![image](imgs/multiagent-min.gif)-->



#### Pokemon
In the game, agents can visit shops, train their Pokémon at the gym, and interact with one another. As a player, you take on the role of an agent and can engage with others at any time. There are 6 characters in the Pokémon environment who appeared in Pokemon Emerald: [May](https://bulbapedia.bulbagarden.net/wiki/May_(game)), [Professor Birch](https://bulbapedia.bulbagarden.net/wiki/Professor_Birch), [Steven Stone](https://bulbapedia.bulbagarden.net/wiki/Steven_Stone), [Maxie](https://bulbapedia.bulbagarden.net/wiki/Maxie), [Archie](https://bulbapedia.bulbagarden.net/wiki/Archie) and [Joseph](https://bulbapedia.bulbagarden.net/wiki/Mr._Stone). 

To launch the Pokemon game, first launch a local server with the following command:
```bash
uvicorn pokemon_server:app --reload --port 10002
```
Then open another terminal in the project's root path and run the following command:
```bash
cd ui
# If you do not have npm installed, you need to install it before running the following commands 
# https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
# We have tested on npm@9.6.4, node@20.0.0
npm install
npm run watch
```
Wait for the compilation to complete, and have fun! (WASD for moving around, and SPACE for launching a conversation.)


https://github.com/gxy233/pokemon_talktutor/blob/main/example_video/screenity.mp4
## 🚀 Getting Started

### Installation

```bash
pip install -U agentverse
```
Or you can install the package by manually cloning the latest repository
```bash
git clone https://github.com/OpenBMB/AgentVerse.git --depth 1
cd AgentVerse
pip install -r requirements.txt
```
Some users have reported problems installing the `orjson` required by `gradio`. One simple workaround is to install it with Anaconda `conda install -c conda-forge orjson`.

You also need to export your OpenAI API key as follows
```bash
# Export your OpenAI API key
export OPENAI_API_KEY="your_api_key_here"
```

If you want to use the tools provided by BMTools, you need to install BMTools as follows:
```bash
git clone git+https://github.com/OpenBMB/BMTools.git
cd BMTools
pip install -r requirements.txt
python setup.py develop
```



## Usage of talk_to_agent.py

### run script
```bash
python talk_to_agent.py
```
### change prompts or add agents
Refers to **AgentVerse/agentverse/tasks/pokemon/config.yaml**
Explore it yourself!