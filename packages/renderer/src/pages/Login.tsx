import md5 from 'md5'
import QRCode from 'qrcode'
import { Fragment } from 'react'
import { loginWithPhone } from '@/api/auth'
import SvgIcon from '@/components/SvgIcon'
import { state } from '@/store'
import { setCookies } from '@/utils/cookie'

enum Method {
  QRCODE = 'qrcode',
  EMAIL = 'email',
  PHONE = 'phone',
}

// Shared components and methods
const EmailInput = ({
  email,
  setEmail,
}: {
  email: string
  setEmail: (email: string) => void
}) => {
  return (
    <div className='w-full'>
      <div className='mb-1 text-sm font-medium text-gray-700 dark:text-gray-300'>Email</div>
      <input
        value={email}
        onChange={e => setEmail(e.target.value)}
        className='w-full rounded-md border border-gray-300 px-2 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
        type='email'
      />
    </div>
  )
}

const PhoneInput = ({
  countryCode,
  setCountryCode,
  phone,
  setPhone,
}: {
  countryCode: string
  setCountryCode: (code: string) => void
  phone: string
  setPhone: (phone: string) => void
}) => {
  return (
    <div className='w-full'>
      <div className='mb-1 text-sm font-medium text-gray-700 dark:text-gray-300'>
        Phone
      </div>
      <div className='flex w-full'>
        <input
          className={classNames(
            'rounded-md rounded-r-none border border-r-0 border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white',
            countryCode.length <= 3 && 'w-14',
            countryCode.length == 4 && 'w-16',
            countryCode.length >= 5 && 'w-20'
          )}
          type='text'
          placeholder='+86'
          value={countryCode}
          onChange={e => setCountryCode(e.target.value)}
        />
        <input
          className='flex-grow rounded-md rounded-l-none border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          type='text'
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
      </div>
    </div>
  )
}

const PasswordInput = ({
  password,
  setPassword,
}: {
  password: string
  setPassword: (password: string) => void
}) => {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <div className='mt-3 flex w-full flex-col'>
      <div className='mb-1 text-sm font-medium text-gray-700  dark:text-gray-300'>
        Password
      </div>
      <div className='flex w-full'>
        <input
          value={password}
          onChange={e => setPassword(e.target.value)}
          className='w-full rounded-md rounded-r-none border border-r-0 border-gray-300 px-2 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          type={showPassword ? 'text' : 'password'}
        />
        <div className='flex items-center justify-center rounded-md rounded-l-none border border-l-0 border-gray-300 pr-1 dark:border-gray-600 dark:bg-gray-700'>
          <button
            onClick={() => setShowPassword(!showPassword)}
            className='dark:hover-text-white cursor-default  rounded p-1.5 text-gray-400 transition duration-300 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-white'
          >
            <SvgIcon
              className='h-5 w-5'
              name={showPassword ? 'eye-off' : 'eye'}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

const LoginButton = ({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled: boolean
}) => {
  // TODO: Add loading indicator
  return (
    <button
      onClick={onClick}
      className={classNames(
        'my-2 mt-6 flex w-full cursor-default items-center justify-center rounded-lg  py-2 text-lg font-semibold  transition duration-200',
        !disabled &&
          'bg-brand-100 text-brand-500 dark:bg-brand-600 dark:text-white',
        disabled &&
          'bg-brand-100 text-brand-300 dark:bg-brand-700 dark:text-white/50'
      )}
    >
      Login
    </button>
  )
}

const OtherLoginMethods = ({
  method,
  setMethod,
}: {
  method: Method
  setMethod: (method: Method) => void
}) => {
  const otherLoginMethods: {
    id: Method
    name: string
  }[] = [
    {
      id: Method.QRCODE,
      name: 'QR Code',
    },
    {
      id: Method.EMAIL,
      name: 'Email',
    },
    {
      id: Method.PHONE,
      name: 'Phone',
    },
  ]
  return (
    <Fragment>
      <div className='mt-8 mb-4 flex w-full items-center'>
        <span className='h-px flex-grow bg-gray-300 dark:bg-gray-700'></span>
        <span className='mx-2 text-sm text-gray-400 '>or</span>
        <span className='h-px flex-grow bg-gray-300 dark:bg-gray-700'></span>
      </div>
      <div className='flex gap-3'>
        {otherLoginMethods.map(
          ({ id, name }) =>
            method !== id && (
              <button
                key={id}
                onClick={() => setMethod(id)}
                className='flex w-full cursor-default items-center justify-center rounded-lg bg-gray-100 py-2 font-medium text-gray-600 transition duration-300 hover:bg-gray-200 hover:text-gray-800 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 dark:hover:text-gray-100'
              >
                <SvgIcon className='mr-2 h-5 w-5' name={id} />
                <span>{name}</span>
              </button>
            )
        )}
      </div>
    </Fragment>
  )
}

const saveCookie = (cookies: string) => {
  setCookies(cookies)
}

// Login with Email
const LoginWithEmail = () => {
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  return (
    <Fragment>
      <EmailInput {...{ email, setEmail }} />
      <PasswordInput {...{ password, setPassword }} />
      <LoginButton onClick={() => toast('Work in progress')} disabled={true} />
    </Fragment>
  )
}

// Login with Phone
const LoginWithPhone = () => {
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const countryCode = useSnapshot(state).uiStates.loginPhoneCountryCode
  const setCountryCode = (countryCode: string) => {
    state.uiStates.loginPhoneCountryCode = countryCode
  }
  const navigate = useNavigate()

  const doLogin = useMutation(
    () => {
      return loginWithPhone({
        countrycode: Number(countryCode.replace('+', '').trim()) || 86,
        phone: phone.trim(),
        md5_password: md5(password.trim()),
      })
    },
    {
      onSuccess: result => {
        if (result?.code !== 200) {
          toast(`Login failed: ${result.code}`)
          return
        }
        saveCookie(result.cookie)
        navigate(-1)
      },
      onError: error => {
        toast(`Login failed: ${error}`)
      },
    }
  )

  const handleLogin = () => {
    if (!countryCode || !Number(countryCode.replace('+', '').trim())) {
      toast.error('Please enter country code')
      return
    }
    if (!phone) {
      toast.error('Please enter phone number')
      return
    }
    if (!password) {
      toast.error('Please enter password')
      return
    }

    doLogin.mutate()
  }

  return (
    <Fragment>
      <PhoneInput {...{ countryCode, setCountryCode, phone, setPhone }} />
      <PasswordInput {...{ password, setPassword }} />
      <LoginButton onClick={handleLogin} disabled={doLogin.isLoading} />
    </Fragment>
  )
}

// Login with QRCode
const LoginWithQRCode = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState('dasdasfa')
  const [qrCodeImage, setQrCodeImage] = useState('')
  useMemo(async () => {
    try {
      const image = await QRCode.toDataURL(qrCodeUrl, {
        width: 1024,
        margin: 0,
        color: {
          dark: '#335eea', // TODO: change brand color
          light: '#ffffff00',
        },
      })
      setQrCodeImage(image)
    } catch (err) {
      console.error(err)
    }
  }, [qrCodeUrl])
  const qrCodeMessage = 'test'
  return (
    <div className='flex flex-col items-center justify-center'>
      <div className='rounded-3xl border p-6 dark:border-gray-700'>
        <img src={qrCodeImage} alt='QR Code' className='no-drag' />
      </div>
      <div className='mt-4 text-sm text-gray-500 dark:text-gray-200'>
        {qrCodeMessage}
      </div>
    </div>
  )
}

export default function Login() {
  const [method, setMethod] = useState<Method>(Method.PHONE)

  return (
    <div className='grid h-full place-content-center'>
      <div className='w-80'>
        {method === Method.EMAIL && <LoginWithEmail />}
        {method === Method.PHONE && <LoginWithPhone />}
        {method === Method.QRCODE && <LoginWithQRCode />}
        <OtherLoginMethods {...{ method, setMethod }} />
      </div>
    </div>
  )
}
