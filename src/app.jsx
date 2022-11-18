import React, { useState, useCallback, useEffect } from "react";
import BigNumber from "bignumber.js";
import classnames from "classnames";
import { providers } from "@starcoin/starcoin";
import StarMaskOnboarding from "@starcoin/starmask-onboarding";
import { AptosClient } from 'aptos';
import nacl from 'tweetnacl';
import { addHexPrefix, stripHexPrefix } from 'ethereumjs-util';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { Account, Mask, makeModal, Token, NODE_URL } from "./modal";
import "./style.css";

export let starcoinProvider;

const ticker = 'APT'
const currentUrl = new URL(window.location.href);
const forwarderOrigin =
  currentUrl.hostname === "localhost"
    ? "http://localhost:3000"
    : undefined;

const { isStarMaskInstalled } = StarMaskOnboarding;

const onboarding = new StarMaskOnboarding({ forwarderOrigin });

const BIG_NUMBER_NANO_STC_MULTIPLIER = new BigNumber("1000000000");

const gas = {
  gasLimit: 127845,
  gasPrice: 1,
};

export const App = () => {
  // Send STC默认信息
  const [defaultToAddr, setAddr] = useState(
    "0xf92e7C5D877036A5C0e5Aa0EA2f38650de307a5Ead1E1827B97bc5f935ed35B3"
  );
  // Send STC默认信息
  const [defaultAmount, setAmount] = useState("0.001");
  // Send STC默认信息
  const [defaultExpired, setExpired] = useState("1800");
  // Send STC 被拒绝
  const [trasError, setTrasError] = useState(false);

  const [transactionHash, setTrans] = useState("");

  const [transTimer, setTimer] = useState(null);

  // 鼠标是否hover了connect按钮
  const [connectOver, setOver] = useState(false);
  // 是否已连接账户
  const [isStarMaskConnected, setConnected] = useState(false);
  // 已连接账户
  const [account, setAccount] = useState([]);
  const [chainId, setChainId] = useState(1);
  const [publicKey, setPublicKey] = useState([]);
  const [isInstall, setInstall] = useState(true);
  const [signResult, setSignResult] = useState("");
  const [signedMessageResponse, setSignedMessageResponse] = useState(null);
  const [signVerifyResult, setSignVerifyResult] = useState("");

  const freshConnected = useCallback(async () => {
    const newAccounts = await window.starcoin.request({
      method: "stc_requestAccounts",
    });
    setAccount([...newAccounts]);
    setConnected(newAccounts && newAccounts.length > 0);
    console.log({newAccounts})
    const client = new AptosClient(NODE_URL)
    const chainId = await client.getChainId()
      console.log({ chainId })
      setChainId(chainId)
  }, []);

  useEffect(() => {
    if (!isStarMaskInstalled()) {
      setInstall(false);
      alert("没有安装 starmask 插件！");
      onboarding.startOnboarding();
    } else {
      setInstall(true);
    }
  }, [freshConnected]);

  useEffect(() => {
    try {
      starcoinProvider = new providers.Web3Provider(
        window.starcoin,
        "any"
      );
    } catch {
      setInstall(false);
    }
  }, []);

  const handleClick = useCallback(() => {
    if (isStarMaskConnected) {
      if (onboarding) {
        onboarding.stopOnboarding();
      }
    } else {
      freshConnected();
    }
  }, [freshConnected, isStarMaskConnected]);

  const handleSendSTC = useCallback(async () => {
    setTrasError("");
    const sendAmountSTC = new BigNumber(String(defaultAmount), 10);
    const sendAmountNanoSTC = sendAmountSTC.times(
      BIG_NUMBER_NANO_STC_MULTIPLIER
    );
    const sendAmountHex = `0x${sendAmountNanoSTC.toString(16)}`;

    const txParams = {
      to: defaultToAddr,
      value: sendAmountHex,
      ...gas,
    };

    const expiredSecs = parseInt(defaultExpired, 10);
    if (expiredSecs > 0) {
      txParams.expiredSecs = expiredSecs;
    }
    try {
      const hash = await starcoinProvider
        .getSigner()
        .sendUncheckedTransaction(txParams);
      setTrans(hash);

      setTimer(
        setTimeout(() => {
          setTrans(false);
        }, 5000)
      );
    } catch (e) {
      console.log(e);
      setTrasError(e.message || "Unkown Error");
    }
  }, [defaultToAddr, defaultExpired, defaultAmount]);

  const exampleMessage = 'Example `personal_sign` message 中文'
  const nonce = "random_string"
  const msgPayload = {
    message: exampleMessage,
    nonce,
    // chainId: true,
    // address: true,
    // application: true
  }

  const handleSignMessage = useCallback(async () => {
    setSignResult('')
    setSignedMessageResponse(null)
    try {
      const signMessageResponse = await window.starcoin.request({
        method: 'apt_sign',
        params: [msgPayload],
      })
      console.log({signMessageResponse})
      setSignedMessageResponse(signMessageResponse)
      setSignResult(signMessageResponse.signature)
    }
    catch (e) {
      setSignResult(e.message || "Unkown Error");
    }
  }, [exampleMessage, account, chainId]);

  const handleSignMessageVerify =  async () => {
    try {
      const publicKeyHex = addHexPrefix(publicKey)
      const verified = nacl.sign.detached.verify(
        Buffer.from(signedMessageResponse.fullMessage, 'utf8'),
        Buffer.from(signedMessageResponse.signature, 'hex'),
        Buffer.from(stripHexPrefix(publicKey), 'hex'),
      );
      if (verified) {
        setSignVerifyResult(`Successfully verified account publicKey as ${ publicKeyHex }`)
      } else {
        setSignVerifyResult(`Verify failed`)
      }
    } catch (err) {
      setSignVerifyResult(`Error: ${ err.message }`)
    }
  } 

  return (
    <div className="tracking-widest">
      {isInstall && (
        <>
          <div
            className={classnames(
              `flex text-gray-200 bg cursor-pointer bg-slate-800 p-6 justify-center duration-300 hover:bg-slate-900 hover:text-gray-50 text-3xl`,
              "bg-fixed bg-no-repeat bg-cover"
            )}
          >
            Aptos
          </div>
          <div className=" flex justify-center mt-4">
            <div className="duration-300 sm:min-w-3/4 lg:min-w-1/2 border-2 border-slate-50 shadow-xl p-8 rounded-2xl mb-6 flex justify-center flex-col">
              <div
                className={classnames(
                  "rounded-2xl text-white font-extrabold p-8 duration-300 flex justify-center",
                  isStarMaskConnected
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-700 hover:bg-blue-900 cursor-pointer"
                )}
                onClick={!isStarMaskConnected ? handleClick : null}
                onMouseOver={() => {
                  setOver(true);
                }}
                onMouseLeave={() => {
                  setOver(false);
                }}
              >
                <div
                  className={classnames(
                    "duration-500",
                    connectOver && !isStarMaskConnected && "scale-125"
                  )}
                >
                  {isStarMaskConnected ? "Connected" : "Connect"}
                </div>
              </div>

              <div
                className={classnames(
                  "duration-300 h-0 opacity-0",
                  isStarMaskConnected && "h-screen opacity-100"
                )}
              >
                {/* Address */}
                <div className="rounded-2xl bg-green-100 text-green-600 p-2 mt-4">
                  <div className="font-bold">Current address: {account[0]}</div>
                </div>

                {/* Send APT */}
                <div className="rounded-2xl border-2 border-slate-50 shadow-xl p-2 mt-4">
                  <div className="font-bold">Send {ticker}</div>
                  <div className="mt-1">To</div>
                  <div className="mt-1">
                    <input
                      className="w-full focus:outline-none p-4 border-solid border-2 border-x-sky-100 rounded-2xl"
                      value={defaultToAddr}
                      onChange={(e) => {
                        setAddr(e.target.value);
                      }}
                    />
                  </div>
                  <div className="mt-1">Amount of {ticker}</div>
                  <div className="mt-1">
                    <input
                      className="w-full focus:outline-none p-4 border-solid border-2 border-x-sky-100 rounded-2xl"
                      value={defaultAmount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                      }}
                    />
                  </div>
                  <div className="mt-1">
                    Transaction Expired Seconds(default 30 minutes)
                  </div>
                  <div className="mt-1">
                    <input
                      className="w-full focus:outline-none p-4 border-solid border-2 border-x-sky-100 rounded-2xl"
                      value={defaultExpired}
                      onChange={(e) => {
                        setExpired(e.target.value);
                      }}
                    />
                  </div>
                  <div
                    className="cursor-pointer duration-300 w-full p-4 mt-4 text-white bg-blue-900 hover:bg-blue-700 rounded-2xl flex justify-center font-bold"
                    onClick={handleSendSTC}
                  >
                    SEND
                  </div>
                  {trasError && (
                    <div className="flex justify-center text-red-800 text-center mt-1 w-full">
                      {trasError}
                    </div>
                  )}
                  <div
                    className={classnames(
                      "mt-2 bg-green-200 text-green-900 p-2 flex justify-center flex-col",
                      transactionHash ? "opacity-100" : "hidden"
                    )}
                  >
                    Transaction Hash:
                    <div>{transactionHash}</div>
                  </div>
                </div>

                {/* Contracts Function */}
                <div className="mt-4 shadow-2xl rounded-2xl border-2 border-slate-50 p-2">
                  <div className="font-bold">Contract Function</div>
                  <div
                    className="mt-4 rounded-2xl bg-blue-900 flex justify-center text-white p-4 font-bold cursor-pointer hover:bg-blue-700 duration-300"
                    onClick={() => {
                      makeModal({
                        children: ({ onClose }) => {
                          return (
                            <>
                              <Mask onClose={onClose} />
                              <Account />
                            </>
                          );
                        },
                      });
                    }}
                  >
                    0x1::coin::transfer APT
                  </div>

                  <div
                    className="mt-4 rounded-2xl bg-blue-900 flex justify-center text-white p-4 font-bold cursor-pointer hover:bg-blue-700 duration-300"
                    onClick={() => {
                      makeModal({
                        children: ({ onClose }) => {
                          return (
                            <>
                              <Mask onClose={onClose} />
                              <Token />
                            </>
                          );
                        },
                      });
                    }}
                  >
                    0x1::coin::transfer Token
                  </div>
                </div>
                {/* Personal Sign */}
               <div className="mt-4 shadow-2xl rounded-2xl border-2 border-slate-50 p-2">
                  <div className="font-bold">Personal Sign</div>
                  <div className="flex justify-center">
                        {exampleMessage}
                  </div>
                  <div
                    className="cursor-pointer duration-300 w-full p-4 mt-4 text-white bg-blue-900 hover:bg-blue-700 rounded-2xl flex justify-center font-bold"
                    onClick={handleSignMessage}
                  >
                    Sign Message
                  </div>
                  <div
                    className={classnames(
                      "mt-2 bg-amber-100 text-green-900 p-2 flex justify-center flex-col break-all",
                       "opacity-100" 
                    )}
                  >
                    Result:
                    <div>{signResult}</div>
                  </div>
                  <div className="mt-1">PublicKey (StarMask -> Account Details -> View PublicKey)</div>
                  <div className="mt-1">
                    <input
                      className="w-full focus:outline-none p-4 border-solid border-2 border-x-sky-100 rounded-2xl"
                      value={publicKey}
                      onChange={(e) => {
                        setPublicKey(e.target.value);
                      }}
                    />
                  </div>
                  <div
                    className="cursor-pointer duration-300 w-full p-4 mt-4 text-white bg-blue-900 hover:bg-blue-700 rounded-2xl flex justify-center font-bold"
                    onClick={handleSignMessageVerify}
                  >
                    Verify with Account PublicKey
                  </div>
                  <div
                    className={classnames(
                      "mt-2 bg-amber-100 text-green-900 p-2 flex justify-center flex-col break-all",
                       "opacity-100" 
                    )}
                  >
                    Verify Result:
                    <div>{signVerifyResult}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
