
interface Message{
    user: string;
    text: string;
    photos?: string[];
    id: string;
    date: string;
    ans: string;
    edit: boolean;
    typeMess: string;
    per: string;
    pin: boolean;
}

export default Message