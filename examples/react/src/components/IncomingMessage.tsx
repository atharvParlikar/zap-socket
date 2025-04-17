export function IncomingMessage({ msg }: { msg: string }) {
  return (
    <div className="flex">
      <div className="bg-gray-200 text-gray-800 p-3 rounded-lg max-w-[75%]">
        {msg}
      </div>
    </div>
  );
}
