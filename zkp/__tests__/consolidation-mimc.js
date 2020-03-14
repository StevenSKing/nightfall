/* eslint-disable import/no-unresolved */

import { erc20 } from '@eyblockchain/nightlite';
import utils from '../src/zkpUtils';
import bc from '../src/web3';

import controller from '../src/f-token-controller';
import { getContractAddress, getTruffleContractInstance } from '../src/contractUtils';
// import vk from '../src/vk-controller';

jest.setTimeout(7200000);

const PROOF_LENGTH = 20;
const C = '0x00000000000000000000000000000028'; // 128 bits = 16 bytes = 32 chars
const E = new Array(20).fill('0x00000000000000000000000000000002');
const skA = '0x0000000000111111111111111111111111111111111111111111111111112111';
// we could generate these but it's nice to have them fixed in case later testing
const skB = [
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100',
  '0x0000000000111111111111111111111111111111111111111111111111111100', // deliberately the same as the last one - to enable a transfer test
];
const S_B_E = [
  '0x0000000000211111111111111111111111111111111111111111111111111100',
  '0x0000000000211111111111111111111111111111111111111111111111111101',
  '0x0000000000211111111111111111111111111111111111111111111111111102',
  '0x0000000000211111111111111111111111111111111111111111111111111103',
  '0x0000000000211111111111111111111111111111111111111111111111111104',
  '0x0000000000211111111111111111111111111111111111111111111111111105',
  '0x0000000000211111111111111111111111111111111111111111111111111106',
  '0x0000000000211111111111111111111111111111111111111111111111111107',
  '0x0000000000211111111111111111111111111111111111111111111111111108',
  '0x0000000000211111111111111111111111111111111111111111111111111109',
  '0x0000000000211111111111111111111111111111111111111111111111111110',
  '0x0000000000211111111111111111111111111111111111111111111111111111',
  '0x0000000000211111111111111111111111111111111111111111111111111112',
  '0x0000000000211111111111111111111111111111111111111111111111111113',
  '0x0000000000211111111111111111111111111111111111111111111111111114',
  '0x0000000000211111111111111111111111111111111111111111111111111115',
  '0x0000000000211111111111111111111111111111111111111111111111111116',
  '0x0000000000211111111111111111111111111111111111111111111111111117',
  '0x0000000000211111111111111111111111111111111111111111111111111118',
  '0x0000000000211111111111111111111111111111111111111111111111111119',
];
let S_A_C;
let pkA;
let pkB = [];
let Z_A_C;
// storage for z indexes
let zInd1;
let zInd2;
const outputCommitments = [];
let accounts;
let fTokenShieldJson;
let fTokenShieldAddress;
let erc20Address;

if (process.env.HASH_TYPE === 'mimc') {
  beforeAll(async done => {
    if (!(await bc.isConnected())) await bc.connect();
    accounts = await (await bc.connection()).eth.getAccounts();
    const { contractJson, contractInstance } = await getTruffleContractInstance('FTokenShield');
    erc20Address = await getContractAddress('FToken');
    const erc20AddressPadded = `0x${utils.strip0x(erc20Address).padStart(64, '0')}`;
    fTokenShieldAddress = contractInstance.address;
    fTokenShieldJson = contractJson;
    for (let i = 0; i < PROOF_LENGTH; i++) {
      pkB[i] = utils.strip0x(utils.hash(skB[i]));
    }
    pkB = await Promise.all(pkB);
    S_A_C = await utils.rndHex(32);
    pkA = utils.strip0x(utils.hash(skA));
    Z_A_C = utils.concatenateThenHash(erc20AddressPadded, C, pkA, S_A_C);
    done();
  });
  // eslint-disable-next-line no-undef
  describe('f-token-controller.js tests', () => {
    // Alice has C + D to start total = 50 ETH
    // Alice sends Bob E and gets F back (Bob has 40 ETH, Alice has 10 ETH)
    // Bob then has E+G at total of 70 ETH
    // Bob sends H to Alice and keeps I (Bob has 50 ETH and Alice has 10+20=30 ETH)
    test('Should be correcly configurated to use MiMC', () => {
      expect(process.env.HASH_TYPE).toEqual('mimc');
    });
    test('Should create 10000 tokens in accounts[0]', async done => {
      // fund some accounts with FToken
      const AMOUNT = 10000;
      const bal1 = await controller.getBalance(accounts[0]);
      await controller.buyFToken(AMOUNT, accounts[0]);
      const bal2 = await controller.getBalance(accounts[0]);
      expect(AMOUNT).toEqual(bal2 - bal1);
      done();
    });

    test('Should mint an ERC-20 commitment Z_A_C for Alice of value C', async done => {
      const { commitment: zTest, commitmentIndex: zIndex } = await erc20.mint(
        C,
        pkA,
        S_A_C,
        // await getVkId('MintFToken'),
        {
          erc20Address,
          account: accounts[0],
          fTokenShieldJson,
          fTokenShieldAddress,
        },
        {
          codePath: `${process.cwd()}/code/gm17/ft-mint/out`,
          outputDirectory: `${process.cwd()}/code/gm17/ft-mint`,
          pkPath: `${process.cwd()}/code/gm17/ft-mint/proving.key`,
        },
      );
      zInd1 = parseInt(zIndex, 10);
      console.log('salt:', S_A_C);
      console.log('pkA:', pkA);
      console.log('expected commitment:', Z_A_C);
      console.log('commitment index:', zInd1);
      expect(Z_A_C).toEqual(zTest);
      done();
    });

    test('Should transfer ERC-20 commitments of various values to ONE receipient and get change', async done => {
      // the E's becomes Bobs'.
      const bal1 = await controller.getBalance(accounts[0]);
      const inputCommitment = { value: C, salt: S_A_C, commitment: Z_A_C, commitmentIndex: zInd1 };

      for (let i = 0; i < E.length; i++) {
        outputCommitments[i] = { value: E[i], salt: S_B_E[i] };
      }
      const response = await erc20.simpleFungibleBatchTransfer(
        inputCommitment,
        outputCommitments,
        pkB, // deliberately the same key x 20 for consolidation transfer
        skA,
        // await getVkId('SimpleBatchTransferFToken'),
        {
          erc20Address,
          account: accounts[0],
          fTokenShieldJson,
          fTokenShieldAddress,
        },
        {
          codePath: `${process.cwd()}/code/gm17/ft-batch-transfer/out`,
          outputDirectory: `${process.cwd()}/code/gm17/ft-batch-transfer`,
          pkPath: `${process.cwd()}/code/gm17/ft-batch-transfer/proving.key`,
        },
      );

      zInd2 = parseInt(response.maxOutputCommitmentIndex, 10);
      outputCommitments.commitment = response.outputCommitments.commitment;
      const bal2 = await controller.getBalance(accounts[0]);
      const wei = parseInt(bal1, 10) - parseInt(bal2, 10);
      console.log('gas consumed was', wei / 20e9);
      console.log('approx total cost in USD @$200/ETH was', wei * 200e-18);
      console.log('approx per transaction cost in USD @$200/ETH was', (wei * 200e-18) / 20);
      done();
    });

    test('Should consolidate the 20 commitments just created', async done => {
      const pkE = await utils.rndHex(32); // public key of Eve, who we transfer to
      const inputCommitments = [];
      for (let i = 0; i < E.length; i++) {
        inputCommitments[i] = {
          value: E[i],
          salt: S_B_E[i],
          commitment: outputCommitments[i].commitment,
          commitmentIndex: zInd2 - E.length + i + 1,
        };
      }
      const outputCommitment = { value: C, salt: await utils.rndHex(32) };

      const response = await erc20.consolidationTransfer(
        inputCommitments,
        outputCommitment,
        pkE,
        skB[0],
        {
          erc20Address,
          account: accounts[0],
          fTokenShieldJson,
          fTokenShieldAddress,
        },
        {
          codePath: `${process.cwd()}/code/gm17/ft-consolidation-transfer/out`,
          outputDirectory: `${process.cwd()}/code/gm17/ft-consolidation-transfer`,
          pkPath: `${process.cwd()}/code/gm17/ft-consolidation-transfer/proving.key`,
        },
      );
      const consolidatedCommitment = response.outputCommitment;
      console.log('Output commitment:', consolidatedCommitment.commitment);
    });
    done();
  });
} else {
  describe('Consolidation MIMC test disabled', () => {
    test('HASH_TYPE env variable is set to `sha`', () => {
      expect(process.env.HASH_TYPE).toEqual('sha');
    });
  });
}
