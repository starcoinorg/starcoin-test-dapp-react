import React from "react";
import BigNumber from "bignumber.js";
import { useEffect } from "react";
import { useState } from "react";
import classnames from "classnames";
import { createRoot } from "react-dom/client";
import { useCallback } from "react";
import { AptosClient, AptosAccount, TxnBuilderTypes, BCS } from 'aptos';

import { arrayify, hexlify } from "@ethersproject/bytes";
import { utils, bcs } from "@starcoin/starcoin";
import { starcoinProvider } from "./app";

export const NODE_URL = "https://fullnode.testnet.aptoslabs.com"
const ticker = 'APT'
export const makeModal = (props) => {
  const { children } = props;
  const escapeNode = document.createElement("div");
  const root = createRoot(escapeNode);
  document.body.appendChild(escapeNode);
  const onClose = () => {
    root.unmount();
    if (document.body.contains(escapeNode)) {
      document.body.removeChild(escapeNode);
    }
  };
  const Child = children({ onClose });
  root.render(<>{Child}</>);
};

const useFadeIn = () => {
  const [isShow, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setShow(true);
    }, 10);
  }, []);

  return { isShow };
};

export const Mask = (props) => {
  const { onClose } = props;
  const { isShow } = useFadeIn();

  return (
    <div
      className={classnames(
        "fixed top-0 bottom-0 left-0 right-0 bg-black duration-300",
        isShow ? "opacity-80" : "opacity-0"
      )}
      onClick={() => {
        onClose();
      }}
    />
  );
};

export const Account = (props) => {
  const { initAccount, initAmount, initExpired } = props;
  const { isShow } = useFadeIn();
  const [account, setAccount] = useState(
    initAccount || "0xf92e7C5D877036A5C0e5Aa0EA2f38650de307a5Ead1E1827B97bc5f935ed35B3"
  );
  const [amount, setAmount] = useState(initAmount || "0.001");
  const [expired, setExpired] = useState(initExpired || "1800");
  const [hash, setHash] = useState("");

  const handleCall = useCallback(async () => {
    try {
      const client = new AptosClient(NODE_URL)

      const sendAmount = parseFloat(amount, 10);
      if (!(sendAmount > 0)) {
        window.alert("Invalid sendAmount: should be a number!");
        return false;
      }
      const BIG_NUMBER_NANO_STC_MULTIPLIER = new BigNumber("100000000");
      const sendAmountSTC = new BigNumber(sendAmount);
      const sendAmountNanoSTC = sendAmountSTC.times(
        BIG_NUMBER_NANO_STC_MULTIPLIER
      );
      console.log(sendAmountNanoSTC.toNumber())

      const token = new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString("0x1::aptos_coin::AptosCoin"));
      const entryFunctionPayload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
        TxnBuilderTypes.EntryFunction.natural(
          "0x1::coin",
          "transfer",
          [token],
          [BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(account)), BCS.bcsSerializeUint64(sendAmountNanoSTC.toNumber())],
        ),
      );
      // console.log({entryFunctionPayload})
      // console.log( entryFunctionPayload instanceof TxnBuilderTypes.TransactionPayloadEntryFunction)
      // const rawTxn = await client.generateRawTransaction(account, entryFunctionPayload);
      // console.log({rawTxn})
      // const privateKeyObject = { privateKeyHex: '0x5d996aa76b3212142792d9130796cd2e11e3c445a93118c08414df4f66bc60ec' };
      // const a1 = AptosAccount.fromAptosAccountObject(privateKeyObject);
      // const bcsTxn = AptosClient.generateBCSTransaction(a1, rawTxn);
      // console.log({bcsTxn})
      // const bcsTxnHex = hexlify(bcsTxn)
      // console.log({bcsTxnHex})

      console.log(BCS.bcsToBytes(entryFunctionPayload))
      const entryFunctionPayloadHex= hexlify(BCS.bcsToBytes(entryFunctionPayload))
      console.log({entryFunctionPayloadHex})

      // console.log(arrayify(entryFunctionPayloadHex))
      // const deserializer = new BCS.Deserializer(arrayify(entryFunctionPayloadHex));
      // const entryFunctionPayload2 = TxnBuilderTypes.TransactionPayloadEntryFunction.deserialize(deserializer);
      // console.log( entryFunctionPayload2 instanceof TxnBuilderTypes.TransactionPayloadEntryFunction)
      // const rawTxn2 = await client.generateRawTransaction(account, entryFunctionPayload2);
      // const bcsTxn2 = AptosClient.generateBCSTransaction(a1, rawTxn2);
      // console.log({bcsTxn2})
      // const bcsTxnHex2 = hexlify(bcsTxn2)
      // console.log({bcsTxnHex2})

      const transaction = {
        type: 'entry_function_payload',
        function: '0x1::coin::transfer',
        type_arguments: ['0x1::aptos_coin::AptosCoin'],
        arguments: [account, sendAmountNanoSTC.toNumber()],
      };
      console.log({transaction})
      const rawTxn3 = await client.generateTransaction(account, transaction);
      console.log({rawTxn3})
      const txParams = {
        // data: entryFunctionPayloadHex,
        functionAptos: transaction
      };
      console.log({txParams})
      // const expiredSecs = parseInt(expired, 10);
      // if (expiredSecs > 0) {
      //   txParams.expiredSecs = expiredSecs;
      // }
      const hash = await starcoinProvider
        .getSigner()
        .sendUncheckedTransaction(txParams);
      console.log({ hash });
      setHash(hash);
    } catch (e) {
      setHash(e.message || "Unkown Error");
    }
  }, [account, amount, expired]);

  return (
    <div
      className={classnames(
        "fixed top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4 rounded-2xl shadow-2xl w-3/4 p-6 bg-white duration-300",
        isShow ? "opacity-100 scale-100" : "opacity-0 scale-50"
      )}
    >
      <div className="font-bold">To</div>
      <div className="mt-2 mb-2">
        <input
          type="text"
          className="focus:outline-none rounded-xl border-2 border-slate-700 w-full p-4"
          value={account}
          onChange={(e) => {
            setAccount(e.target.value);
          }}
        />
      </div>
      <div className="font-bold">Amount of {ticker}</div>
      <div className="mt-2 mb-2">
        <input
          type="text"
          className="focus:outline-none rounded-xl border-2 border-slate-700 w-full p-4"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
          }}
        />
      </div>
      <div className="font-bold">Expired</div>
      <div className="mt-2 mb-2">
        <input
          type="text"
          className="focus:outline-none rounded-xl border-2 border-slate-700 w-full p-4"
          value={expired}
          onChange={(e) => {
            setExpired(e.target.value);
          }}
        />
      </div>
      <div
        className="mt-6 p-4 flex justify-center font-bold bg-blue-900 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        onClick={handleCall}
      >
        CALL
      </div>
      {hash && (
        <div className="text-center mt-2 text-gray-500 break-all">
          Transaction: {hash}
        </div>
      )}
    </div>
  );
};


export const Token = (props) => {
  const { initAccount, initAmount, initCode } = props;
  const { isShow } = useFadeIn();
  const [account, setAccount] = useState(
    initAccount || "0x67bfab475d188c3d5a17d1f067c715e78d46ea38af43e601530d79431659c518"
  );
  const [amount, setAmount] = useState(initAmount || "0.01");
  const [code, setCode] = useState(initCode || "0x1::aptos_coin::AptosCoin");
  const [hash, setHash] = useState("");

  const handleCall = useCallback(async () => {
    try {
      console.log({code,account,amount})
      const client = new AptosClient(NODE_URL)

      const sendAmount = parseFloat(amount, 10);
      if (!(sendAmount > 0)) {
        window.alert("Invalid sendAmount: should be a number!");
        return false;
      }
      const BIG_NUMBER_NANO_STC_MULTIPLIER = new BigNumber("100000000");
      const sendAmountSTC = new BigNumber(sendAmount);
      const sendAmountNanoSTC = sendAmountSTC.times(
        BIG_NUMBER_NANO_STC_MULTIPLIER
      );
      console.log(amount,sendAmount,sendAmountNanoSTC.toNumber())

      const transaction = {
        type: 'entry_function_payload',
        function: '0x1::coin::transfer',
        type_arguments: [code],
        arguments: [account, sendAmountNanoSTC.toNumber()],
      };
      console.log({transaction})
      const rawTxn3 = await client.generateTransaction(account, transaction);
      console.log({rawTxn3})
      const txParams = {
        functionAptos: transaction
      };
      console.log({txParams})
      // const expiredSecs = parseInt(expired, 10);
      // if (expiredSecs > 0) {
      //   txParams.expiredSecs = expiredSecs;
      // }
      const hash = await starcoinProvider
        .getSigner()
        .sendUncheckedTransaction(txParams);
      console.log({ hash });
      setHash(hash);
    } catch (e) {
      setHash(e.message || "Unkown Error");
    }
  }, [account, amount, code]);

  return (
    <div
      className={classnames(
        "fixed top-2/4 left-2/4 -translate-x-2/4 -translate-y-2/4 rounded-2xl shadow-2xl w-3/4 p-6 bg-white duration-300",
        isShow ? "opacity-100 scale-100" : "opacity-0 scale-50"
      )}
    >
      <div className="font-bold">Code</div>
      <div className="mt-2 mb-2">
        <input
          type="text"
          className="focus:outline-none rounded-xl border-2 border-slate-700 w-full p-4"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
          }}
        />
      </div>
      <div className="font-bold">To</div>
      <div className="mt-2 mb-2">
        <input
          type="text"
          className="focus:outline-none rounded-xl border-2 border-slate-700 w-full p-4"
          value={account}
          onChange={(e) => {
            setAccount(e.target.value);
          }}
        />
      </div>
      <div className="font-bold">Amount</div>
      <div className="mt-2 mb-2">
        <input
          type="text"
          className="focus:outline-none rounded-xl border-2 border-slate-700 w-full p-4"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
          }}
        />
      </div>
      
      <div
        className="mt-6 p-4 flex justify-center font-bold bg-blue-900 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
        onClick={handleCall}
      >
        CALL
      </div>
      {hash && (
        <div className="text-center mt-2 text-gray-500 break-all">
          Transaction: {hash}
        </div>
      )}
    </div>
  );
};
