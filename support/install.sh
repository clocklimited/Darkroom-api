#!/bin/bash

installUpstart() {
  APP=$1
  upstartScript=$upstartTmp/node-$APP.$DOMAIN.conf
  cp support/upstart-config.conf $upstartScript
  sed -i'' -e "s/{ENV}/$NODE_ENV/g" $upstartScript
  sed -i'' -e "s/{PORT}/$PORT/g" $upstartScript
  sed -i'' -e "s/{KEY}/$KEY/g" $upstartScript
  sed -i'' -e "s/{API_PROCESSES}/$API_PROCESSES/g" $upstartScript
  sed -i'' -e "s/{DOMAIN}/$DOMAIN/g" $upstartScript
  sed -i'' -e "s/{APP}/$APP/g" $upstartScript
  sed -i'' -e "s/{NODE_VERSION}/$nodeVersion/g" $upstartScript
  sed -i'' -e "s/{NODE_USER}/$nodeUser/g" $upstartScript
}

# Break on failure
set -e

# Ensure the environment is set
if [ -z $NODE_ENV ] ; then
  echo You must provide an environment. ie NODE_ENV=testing PORT=5277 nave use 0.10 $0
  exit 1
fi

# Ensure this is in a nave shell
if [ -z $NAVE ] ; then
  echo This must be run in a 'nave' shell. ie NODE_ENV=testing PORT=5277 nave use 0.10 $0
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
  echo You must provide a base port. ie NODE_ENV=testing PORT=5277 nave use 0.10 $0
  exit 4
fi

if [ -z $SALT ] ; then
  echo "You must provide a salt (key). ie SALT=n0mn0mn0m NODE_ENV=testing PORT=5277 nave use 0.10 $0"
  exit 5
fi

if [ -z $API_PROCESSES ] ; then
  echo You must provide a base amount of processes. ie API_PROCESSES=4 NODE_ENV=testing PORT=5277 nave use 0.10 $0
  exit 6
fi

nodeUser=node
if [ $NODE_ENV != "testing" ]; then
  nodeUser=www-data
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
locations=locations.js

cp -a . $tmp
cd $tmp
sed -i'' -e "s,{DATA},'$dataPath',g" $locations.tpl
sed -i'' -e "s,{CACHE},'$cachePath',g" $locations.tpl
sed -i'' -e "s,{PORT},'$PORT',g" $locations.tpl
sed -i'' -e "s,{SALT},'$SALT',g" $locations.tpl
sed -i'' -e "s,{KEY},'$KEY',g" $locations.tpl
mv $locations.tpl $locations
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
