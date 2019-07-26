apt install git build-essential python
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
nvm install 9.4 && npm install -g npm
npm install -g check-node-version npm-run@4.1.2 rimraf cpr renamer nodemon typescript@2.6.2
ssh-keygen -t rsa -b 4096 -C "darekf77@gmail.com" && cat ~/.ssh/id_rsa.pub
read -n1 -r -p "Please add the ssh key above to your github ssh keys..." key
git clone git@github.com:darekf77/tsc-npm-project.git
cd tsc-npm-project
npm i && tsc && npm link
# increase number of watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
# sudo sysctl fs.inotify.max_user_watches=16384 fix for https://github.com/sass/node-sass/issues/2534 no space left

git config --global user.email "darekf77@gmail.com"
git config --global user.name  "Dariusz"

echo "Client configuration done"
