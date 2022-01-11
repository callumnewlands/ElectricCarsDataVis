# Run in Coursework/ inside the bash shell on Windows
# set -x #echo on

npx babel chart1.js --out-file out/chart1-compiled.js
sed -i 's/&/\\\\&/g' out/chart1-compiled.js
npx babel chart2.js --out-file out/chart2-compiled.js
sed -i 's/&/\\\\&/g' out/chart2-compiled.js
sed -i 's/\\d/\\\\d/g' out/chart2-compiled.js
sed -i 's/\\\//\\\\\//g' out/chart2-compiled.js
npx babel chart3.js --out-file out/chart3-compiled.js
sed -i 's/&/\\\\&/g' out/chart3-compiled.js
npx babel loadSources.js --out-file out/loadSources-compiled.js
sed -i 's/&/\\\\&/g' out/loadSources-compiled.js

cp index.html out/index.html

# code=$(cat datasources.js)
# replacement='<script>'$code'</script>'
# awk -i inplace -v REP="$replacement" '{
#     sub(/<script src="datasources\.js"><\/script>/, REP);
#     print;
# }'  out/index.html

code=$(cat out/chart1-compiled.js)
replacement='<script>'$code'</script>'
awk -i inplace -v REP="$replacement" '{
    sub(/<script src="chart1\.js"><\/script>/, REP);
    print;
}'  out/index.html

code=$(cat out/chart2-compiled.js)
replacement='<script>'$code'</script>'
awk -i inplace -v REP="$replacement" '{
    sub(/<script src="chart2\.js"><\/script>/, REP);
    print;
}'  out/index.html

code=$(cat out/chart3-compiled.js)
replacement='<script>'$code'</script>'
awk -i inplace -v REP="$replacement" '{
    sub(/<script src="chart3\.js"><\/script>/, REP);
    print;
}'  out/index.html

code=$(cat out/loadSources-compiled.js)
replacement='<script>'$code'</script>'
awk -i inplace -v REP="$replacement" '{
    sub(/<script src="loadSources\.js"><\/script>/, REP);
    print;
}'  out/index.html

rm out/*-compiled.js