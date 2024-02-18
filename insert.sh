pm2 start insert.js --no-autorestart --name insert1 -- RDEklSXCD4C 500 100
pm2 start insert.js --no-autorestart --name insert2 -- HEWq6yr4cs5 250 100
pm2 start insert.js --no-autorestart --name insert3 -- IXxHJADVCkb 500 100


pm2 start trasfer.js --name transfer1 -- RDEklSXCD4C
pm2 start trasfer.js --name transfer2 -- HEWq6yr4cs5
pm2 start trasfer.js --name transfer3 -- IXxHJADVCkb


pm2 restart trasfer1
pm2 restart trasfer2
pm2 restart trasfer3


pm2 delete transfer1
pm2 delete transfer2
pm2 delete transfer3


curl -X DELETE "localhost:9200/rdeklsxcd4c?pretty"
curl -X DELETE "localhost:9200/tuljephu0um?pretty"
curl -X DELETE "localhost:9200/haaslv2ur0l?pretty"
curl -X DELETE "localhost:9200/b9ei27lmqrz?pretty"
curl -X DELETE "localhost:9200/kklayguncml?pretty"
curl -X DELETE "localhost:9200/latgkmbf7yv?pretty"
curl -X DELETE "localhost:9200/yz3zh5ifezm?pretty"
curl -X DELETE "localhost:9200/evkas8ljnbo?pretty"
curl -X DELETE "localhost:9200/sxnxrdtsjzp?pretty"
curl -X DELETE "localhost:9200/cs61idhyntk?pretty"
curl -X DELETE "localhost:9200/kofm3jjl7n7?pretty"
curl -X DELETE "localhost:9200/hg8f2ohckvh?pretty"
curl -X DELETE "localhost:9200/qnxroc1wiya?pretty"
curl -X DELETE "localhost:9200/layering?pretty"
curl -X DELETE "localhost:9200/ixxhjadvckb?pretty"
curl -X DELETE "localhost:9200/atzwdrojnxj?pretty"
curl -X DELETE "localhost:9200/vzkqbbglj3o?pretty"
curl -X DELETE "localhost:9200/layering2?pretty"



curl -X PUT "localhost:9200/hg8f2ohckvh?pretty"
curl -X PUT "localhost:9200/rdeklsxcd4c?pretty"
curl -X PUT "localhost:9200/tuljephu0um?pretty"
curl -X PUT "localhost:9200/haaslv2ur0l?pretty"
curl -X PUT "localhost:9200/b9ei27lmqrz?pretty"
curl -X PUT "localhost:9200/kklayguncml?pretty"
curl -X PUT "localhost:9200/latgkmbf7yv?pretty"
curl -X PUT "localhost:9200/yz3zh5ifezm?pretty"
curl -X PUT "localhost:9200/evkas8ljnbo?pretty"
curl -X PUT "localhost:9200/sxnxrdtsjzp?pretty"
curl -X PUT "localhost:9200/cs61idhyntk?pretty"
curl -X PUT "localhost:9200/kofm3jjl7n7?pretty"
curl -X PUT "localhost:9200/qnxroc1wiya?pretty"
curl -X PUT "localhost:9200/layering?pretty"
curl -X PUT "localhost:9200/ixxhjadvckb?pretty"
curl -X PUT "localhost:9200/atzwdrojnxj?pretty"
curl -X PUT "localhost:9200/vzkqbbglj3o?pretty"
curl -X PUT "localhost:9200/layering2?pretty"



curl -s -XPUT http://localhost:9200/hg8f2ohckvh/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/rdeklsxcd4c/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/tuljephu0um/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/haaslv2ur0l/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/b9ei27lmqrz/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/kklayguncml/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/latgkmbf7yv/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/yz3zh5ifezm/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/evkas8ljnbo/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/sxnxrdtsjzp/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/cs61idhyntk/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/cs61idhyntk/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/kofm3jjl7n7/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/qnxroc1wiya/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/layering/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/ixxhjadvckb/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/atzwdrojnxj/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/vzkqbbglj3o/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
curl -s -XPUT http://localhost:9200/layering2/_settings  -H 'Content-Type: application/json' -d '{"index.mapping.total_fields.limit": 2000}'
