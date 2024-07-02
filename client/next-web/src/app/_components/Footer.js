export default function Footer() {
  return (
    <footer className='bg-black-100 pb-16'>
      <p className='copyright text-xs text-center my-7'>
        {process.env.NEXT_PUBLIC_RC_BUILD_NUMBER}
      </p>
    </footer>
  );
}
