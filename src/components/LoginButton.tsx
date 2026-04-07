'use client'
import React, {useState} from 'react'
import {useRouter} from 'next/navigation'
import {whiteLoadingSvg} from './svg';
import {useCommonContext} from '~/context/common-context';

const LoginButton = ({
                       buttonType = 0,
                       loginText = 'Log in',
                       className = ''
                     }) => {

  const router = useRouter();

  const {
    userData,
    setUserData,
    setShowLoginModal,
    setShowLogoutModal
  } = useCommonContext()
  const [loading, setLoading] = useState(false)

  async function login(event) {
    event.preventDefault();
    setLoading(true)
    let _userData;
    if (userData == null || Object.keys(userData).length == 0) {
      _userData = null
    } else {
      _userData = userData
    }

    if (_userData != null && Object.keys(_userData).length != 0) {
      router.refresh();
    } else {
      setShowLoginModal(true)
      setLoading(false)
    }
  }

  async function logout() {
    setShowLogoutModal(true);
  }
  const avatarText = (userData?.name || userData?.email || 'U').slice(0, 1).toUpperCase();

  return (
    <>
      {
        buttonType == 0 && (
          <>
            {
              loading ? (
                  <button
                    className={`inline-flex justify-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold ${className}`}
                    disabled
                  >
                    <p>{loginText}</p>
                    {whiteLoadingSvg}
                  </button>
                ) :
                (
                  <button
                    className={`inline-flex justify-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold ${className}`}
                    onClick={login}
                  >
                    {loginText}
                  </button>
                )
            }
          </>
        )
      }
      {
        buttonType == 1 && (
          <>
            {
              <button
                className={`inline-flex justify-center gap-x-1.5 rounded-md text-sm font-semibold ${className}`}
                onClick={logout}
              >
                {userData?.image ? (
                  <img className="h-8 w-8 rounded-full object-cover" src={userData.image} alt={userData?.name || 'user'} />
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
                    {avatarText}
                  </span>
                )}
              </button>
            }
          </>
        )
      }
    </>
  )
}

export default LoginButton
