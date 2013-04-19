#!/bin/bash

installUpstart() {
  APP=$1
  upstartScript=$upstartTmp/node-$APP.$DOMAIN.conf
  cp support/upstart-config.conf $upstartScript
  sed -i'' -e "s/{ENV}/$NODE_ENV/g" $upstartScript
  sed -i'' -e "s/{PORT}/$PORT/g" $upstartScript
  sed -i'' -e "s/{DOMAIN}/$DOMAIN/g" $upstartScript
  sed -i'' -e "s/{APP}/$APP/g" $upstartScript
  sed -i'' -e "s/{NODE_VERSION}/$nodeVersion/g" $upstartScript
}

# Break on failure
set -e

# Ensure the environment is set
if [ -z $NODE_ENV ] ; then
  echo You must provide an environment. ie NODE_ENV=testing PORT=5277 nave use 0.10.1 $0
  exit 1
fi

# Ensure this is in a nave shell
if [ -z $NAVE ] ; then
  echo This must be run in a 'nave' shell. ie NODE_ENV=testing PORT=5277 nave use 0.10.1 $0
  echo Run 'sudo npm install -g nave' If you haven\'t got nave.
  exit 2
fi

DOMAIN=$1
# Ensure a domain argument
if [ -z $DOMAIN ] ; then
  echo Unable to read domain from properties.js
  exit 3
fi

if [ -z $PORT ] ; then
  echo You must provide a base port. ie NODE_ENV=testing PORT=5277 nave use 0.10.1 $0
  exit 4
fi

tmp=`mktemp -d -u -t XXXXXXXX`
upstartTmp=`mktemp -d -u -t XXXXXXXX`
mkdir -p $upstartTmp
nodeVersion=`node -v`

now=$(date +"%Y-%d-%m-%H%M%S")

echo Copying to $tmp
logPath=/var/log/application/$DOMAIN
path=/var/application/$DOMAIN
dataPath=/var/data/application/$DOMAIN/images/
cachePath=/var/cache/application/$DOMAIN/images/
sed -i'' -e "s,{DATA},'$dataPath',g" $locations
sed -i'' -e "s,{CACHE},'$cachePath',g" $locations
sed -i'' -e "s,{PORT},'$PORT',g" $locations
sed -i'' -e "s,{SALT},'$SALT',g" $locations
cp -a . $tmp
cd $tmp
rm -rf .git

npm install $NPMOPTS
installUpstart darkroom


set +e

if [ -d "$path" ]; then
  mv $path $path.$now
else
  mkdir -p /var/application/
fi
echo "chmod g+w -R $path"
echo "mkdir -p $dataPath"
echo "mkdir -p $cachePath"
mv $tmp $path
set -e
cd -



echo ""
echo "Please run the following two commands manually (you may need the help of someone with root access):"
echo ""
echo "sudo /sbin/stop node-darkroom.$DOMAIN"

echo "sudo mv $upstartTmp/* /etc/init/"
echo "sudo /sbin/start node-darkroom.$DOMAIN"
echo ""
