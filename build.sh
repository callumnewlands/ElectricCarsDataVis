# Transpile the source files into out/
# Run in Coursework/ inside the bash shell on Windows
# set -x #echo on

npx babel src/chart1.js --out-file out/chart1-compiled.js
npx babel src/chart2.js --out-file out/chart2-compiled.js
npx babel src/chart3.js --out-file out/chart3-compiled.js
npx babel src/loadSources.js --out-file out/loadSources-compiled.js

cp src/index.html out/index.html
cp src/style.css out/style.css
cp -R datasources out/datasources

code=chart1-compiled.js
awk -i inplace -v REP="src=\"$code\"" '{
    sub(/src="chart1\.js"/, REP);
    print;
}'  out/index.html

code=chart2-compiled.js
awk -i inplace -v REP="src=\"$code\"" '{
    sub(/src="chart2\.js"/, REP);
    print;
}'  out/index.html

code=chart3-compiled.js
awk -i inplace -v REP="src=\"$code\"" '{
    sub(/src="chart3\.js"/, REP);
    print;
}'  out/index.html

code=loadSources-compiled.js
awk -i inplace -v REP="src=\"$code\"" '{
    sub(/src="loadSources\.js"/, REP);
    print;
}'  out/index.html