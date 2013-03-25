#!/bin/sh

# Break on failure
set -e

# Ensure the environment is set
if [ -z $NODE_ENV ] ; then
  echo You must provide an environment. ie NODE_ENV=testing nave use 0.10.1 $0
  exit 1
fi

# Ensure this is in a nave shell
if [ -z $NAVE ] ; then
  echo This must be run in a 'nave' shell. ie NODE_ENV=testing nave use 0.10.1 $0
  echo Run 'sudo npm install -g nave' If you haven\'t got nave.
  exit 2
fi

DOMAIN=$1
# Ensure a domain argument
if [ -z $DOMAIN ] ; then
  echo You must provide a domain name. ie NODE_ENV=testing nave use 0.10.1 $0 testing.catfish.clockhosting.com
  exit 3
fi

if [ -z $PORT ] ; then
  PORT=8334
fi

tmp=`mktemp -d -u -t XXXXXXXX`
nodeVersion=`node -v`
upstartScript=/etc/init/node-$DOMAIN.conf
now=$(date +"%Y%d%m%H%M%S")

git clone . $tmp
cd $tmp
rm -rf .git
npm install --production
node ./node_modules/pliers/pliers-cli.js build -a

if [ -d "$upstartScript" ]; then
  sudo rm $upstartScript
fi

sudo cp upstart-config.conf $upstartScript
sudo sed -i'' -e "s/{ENV}/$NODE_ENV/g" $upstartScript
sudo sed -i'' -e "s/{PORT}/$PORT/g" $upstartScript
sudo sed -i'' -e "s/{DOMAIN}/$DOMAIN/g" $upstartScript
sudo sed -i'' -e "s/{NODE_VERSION}/$nodeVersion/g" $upstartScript

logPath=/var/log/application/$DOMAIN
path=/var/application/$DOMAIN

set +e
sudo stop node-$DOMAIN
if [ -d "$path" ]; then
  mv $path $path.$now
else
  mkdir -p /var/application/
fi
sudo restart node-$DOMAIN || sudo start node-$DOMAIN
set -e
cd -

mv $tmp $path