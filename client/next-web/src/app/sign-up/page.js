import { SignUp } from "@clerk/nextjs";
 
const SignUpPage = () => (
  <div className="w-screen h-screen flex flex-row items-center justify-center"> 
    <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
  </div>
);
export default SignUpPage;