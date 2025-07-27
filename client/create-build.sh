rm build.zip
rm -R build
npm run build
zip -r build.zip build
rm /Users/ankeshsomani/workspace/prod-ssh/ankesh-digitalocean/build.zip
cp build.zip /Users/ankeshsomani/workspace/prod-ssh/ankesh-digitalocean/badminton_build.zip
