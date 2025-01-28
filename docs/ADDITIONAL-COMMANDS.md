## Tnp start
Combined **Angular app build** and **Isomorphic/library build**
start everything *fast*.
```bash
tnp start
tnp s

tnp start --websql 
tnp s --websql 
```

## Tnp init
Initialize all file structure (normally this process happen automatically
in first order during: build, start, app commands )
```bash
tnp init # init current project 

tnp init:all # init current project and first level children
tnp initall # alias init:all
```

## Running nodejs backend app 
Usually you **don't** use this command for development 

-> **debugger** from Visual Studio Code is for this 
(F5 on keyboard, Task "Debug/Start Server"). 
```bash
tnp run
```


## Tnp extension for Visual Studio Code 
 Install essential vscode plugins from project workspace recommended

```bash
tnp vscode:ext
tnp ext
```

## Tnp global config for Visual Studio Code 

Apply best global config for VScode

```bash
tnp vscode:global
```

## Install mkdocs manually
```bash
pip3 install mkdocs
pip3 install mkdocs-material --user
```

```bash
brew install mkdocs
brew install mkdocs-material
```

## Pause
Pause terminal test
```bash
tnp pause
```

## Github pages from /docs to branch
Pause terminal test
```bash
tnp ghPagesInit
tnp gh:pages:init
tnp ghpagesinit
tnp ghPagesInit --full # full process with deleting /docs files
tnp ghPagesInit --provider bitbucket # specify different provider
```

## Show version of projects inside container
```bash
tnp versions
```


## Download video as mp3

Download mp3 from url (got to ~/Download/mp3-from-websites)

```bash
tnp mp3 <url to video>
```


## Download video as mp4 video

Download mp4 from url (got to ~/Download/mp4-from-websites)

```bash
tnp mp4 <url to video>
```

