import { SignIn } from "@clerk/nextjs";
 
const SignInPage = () => (
  <div className="w-screen h-screen flex flex-row items-center justify-center">  
    <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
  </div>
);
export default SignInPage;