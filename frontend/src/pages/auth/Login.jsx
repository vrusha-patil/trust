import { useState } from "react";
import { FcGoogle } from "react-icons/fc";

export default function Login() {

  const [mobile,setMobile] = useState("");
  const [showOtp,setShowOtp] = useState(false);
  const [otp,setOtp] = useState(["","","","","",""]);

  const handleOtpChange = (value,index)=>{
    const newOtp=[...otp];
    newOtp[index]=value;
    setOtp(newOtp);
  }

  return (

<div className="min-h-screen flex items-center justify-center bg-gray-50">

<div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">

{/* HEADER */}

<h1 className="text-3xl font-semibold text-center mb-2">
Temple Management
</h1>

<p className="text-center text-gray-500 mb-6">
Sign in to your account
</p>


{/* GOOGLE LOGIN */}

<button className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg p-3 hover:bg-gray-50 transition">

<FcGoogle size={22}/>

Continue with Google

</button>


{/* DIVIDER */}

<div className="flex items-center my-6">

<div className="flex-grow border-t"></div>

<span className="mx-3 text-gray-400 text-sm">OR</span>

<div className="flex-grow border-t"></div>

</div>


{/* EMAIL LOGIN */}

<div className="space-y-4">

<input
type="email"
placeholder="Email address"
className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
/>

<input
type="password"
placeholder="Password"
className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
/>

<button className="w-full bg-orange-500 text-white p-3 rounded-lg hover:bg-orange-600 transition font-medium">
Sign In
</button>

</div>


{/* MOBILE LOGIN */}

<div className="mt-6">

<p className="text-sm text-gray-500 mb-2">
Login with Mobile OTP
</p>

<input
type="tel"
placeholder="Mobile number"
value={mobile}
onChange={(e)=>setMobile(e.target.value)}
className="w-full border border-gray-300 p-3 rounded-lg mb-3"
/>

{!showOtp && (

<button
onClick={()=>setShowOtp(true)}
className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition"
>
Send OTP
</button>

)}

{showOtp && (

<div>

<div className="flex justify-between gap-2 mb-3">

{otp.map((digit,index)=>(
<input
key={index}
maxLength="1"
value={digit}
onChange={(e)=>handleOtpChange(e.target.value,index)}
className="w-10 h-10 border rounded-md text-center text-lg"
/>
))}

</div>

<button className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600">
Verify OTP
</button>

</div>

)}

</div>


{/* FOOTER */}

<p className="text-center text-sm text-gray-500 mt-6">
Don't have an account? 
<span className="text-orange-500 ml-1 cursor-pointer">
Register
</span>
</p>

</div>

</div>

  );
}