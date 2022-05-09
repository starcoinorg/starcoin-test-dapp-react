import React from "react";
import BigNumber from "bignumber.js";
import { useEffect } from "react";
import { useState } from "react";
import classnames from "classnames";
import { createRoot } from "react-dom/client";
import { useCallback } from "react";
import { arrayify, hexlify } from "@ethersproject/bytes";
import { utils, bcs } from "@starcoin/starcoin";
import { starcoinProvider } from "./app";

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
    initAccount || "0x46ecE7c1e39fb6943059565E2621b312"
  );
  const [amount, setAmount] = useState(initAmount || "0.001");
  const [expired, setExpired] = useState(initExpired || "1800");
  const [hash, setHash] = useState("");

  const handleCall = useCallback(async () => {
    try {
      const functionId = "0x1::TransferScripts::peer_to_peer_v2";
      const strTypeArgs = ["0x1::STC::STC"];
      const tyArgs = utils.tx.encodeStructTypeTags(strTypeArgs);
      const sendAmount = parseFloat(amount, 10);
      if (!(sendAmount > 0)) {
        window.alert("Invalid sendAmount: should be a number!");
        return false;
      }
      const BIG_NUMBER_NANO_STC_MULTIPLIER = new BigNumber("1000000000");
      const sendAmountSTC = new BigNumber(String(sendAmount), 10);
      const sendAmountNanoSTC = sendAmountSTC.times(
        BIG_NUMBER_NANO_STC_MULTIPLIER
      );
      const sendAmountHex = `0x${sendAmountNanoSTC.toString(16)}`; // Multiple BcsSerializers should be used in different closures, otherwise, the latter will be contaminated by the former.
      const amountSCSHex = (function () {
        const se = new bcs.BcsSerializer();
        // eslint-disable-next-line no-undef
        se.serializeU128(BigInt(sendAmountNanoSTC.toString(10)));
        return hexlify(se.getBytes());
      })();

      const args = [arrayify(account), arrayify(amountSCSHex)];

      const scriptFunction = utils.tx.encodeScriptFunction(
        functionId,
        tyArgs,
        args
      );

      // Multiple BcsSerializers should be used in different closures, otherwise, the latter will be contaminated by the former.
      const payloadInHex = (function () {
        const se = new bcs.BcsSerializer();
        scriptFunction.serialize(se);
        return hexlify(se.getBytes());
      })();

      const txParams = {
        data: payloadInHex,
      };

      const expiredSecs = parseInt(expired, 10);
      if (expiredSecs > 0) {
        txParams.expiredSecs = expiredSecs;
      }
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
      <div className="font-bold">Amount of STC</div>
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
