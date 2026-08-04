import { useNavigate, useParams } from 'react-router-dom';
import RequestSheet from '../components/RequestSheet';

export default function RequestDetail() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  return <RequestSheet requestId={Number(requestId)} embedded onClose={() => navigate('/requests')} />;
}
