'use client'
import React from 'react'
import {Fragment, useState} from 'react'
import {Dialog, Transition} from '@headlessui/react'
import {blackLoadingSvg} from './svg'
import {useCommonContext} from "~/context/common-context";
import {signInUseAuth} from "~/libs/nextAuthClient";
import Image from "next/image";

const style = {
  loginGoogleBtn: 'inline-flex w-full justify-center items-center space-x-3 rounded-md  px-3 py-2 text-sm font-semibold shadow-sm hover:border-indigo-400 border-2  border-indigo-600  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
}

const LoginModal = ({
                      loadingText,
                      redirectPath,
                      loginModalDesc,
                      loginModalButtonText,
                    }) => {

  const [loadGoogle, setLoadGoogle] = useState(false)
  const {showLoginModal, setShowLoginModal} = useCommonContext();


  return (
    <Transition.Root show={showLoginModal} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setShowLoginModal} onClick={() => setShowLoginModal(true)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"/>
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                <div>

                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3"
                                  className="gradient-text text-3xl font-bold flex justify-center items-center">
                      <a className="-m-1.5 ml-0.5 p-1.5">
                        <img
                          className="h-8 w-auto"
                          src="/website.svg"
                          width={32}
                          height={24}
                          alt={process.env.NEXT_PUBLIC_DOMAIN_NAME}
                        />
                      </a>
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {loginModalDesc}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 space-y-3">
                  {
                    loadGoogle ? (
                      <button
                        type="button"
                        className={style.loginGoogleBtn}
                        disabled
                      >
                        {blackLoadingSvg}
                        <p>{loadingText}</p>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={"inline-flex w-full justify-center items-center space-x-3 rounded-md px-3 py-2 text-sm font-semibold shadow-sm hover:border-indigo-400 border-2 border-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"}
                        onClick={async () => {
                          await signInUseAuth({
                            redirectPath: redirectPath
                          })
                          setLoadGoogle(true)
                        }}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                          />
                          <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        <p>{loginModalButtonText}</p>
                      </button>
                    )
                  }
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export default LoginModal
