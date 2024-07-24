export ANCHOR_WALLET=key.json
#export ANCHOR_WALLET=~/.config/solana/id.json
export ANCHOR_PROVIDER_URL=https://xolana.xen.network

node_modules/.bin/ts-mocha --no-warnings -p ./tsconfig.json -t 1000000 tests/init_tests.ts
sleep 1;
node_modules/.bin/ts-mocha --no-warnings -p ./tsconfig.json -t 1000000 tests/payment_test.ts
sleep 1;
node_modules/.bin/ts-mocha --no-warnings -p ./tsconfig.json -t 1000000 tests/run_game_test.ts
