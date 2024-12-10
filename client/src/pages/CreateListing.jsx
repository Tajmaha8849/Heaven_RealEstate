import { useState } from 'react';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { app } from '../firebase';

import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export default function CreateListing() {
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    imageUrls: [],
    name: '',
    description: '',
    address: '',
    type: 'rent',
    bedrooms: 1,
    bathrooms: 1,
    regularPrice: 50,
    discountPrice: 0,
    offer: false,
    parking: false,
    furnished: false,
  });
  const [imageUploadError, setImageUploadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  console.log(formData);
  const handleImageSubmit = (e) => {
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = [];

      for (let i = 0; i < files.length; i++) {
        promises.push(storeImage(files[i]));
      }
      Promise.all(promises)
        .then((urls) => {
          setFormData({
            ...formData,
            imageUrls: formData.imageUrls.concat(urls),
          });
          setImageUploadError(false);
          setUploading(false);
        })
        .catch((err) => {
          setImageUploadError('Image upload failed (2 mb max per image)');
          setUploading(false);
        });
    } else {
      setImageUploadError('You can only upload 6 images per listing');
      setUploading(false);
    }
  };

  const storeImage = async (file) => {
    return new Promise((resolve, reject) => {
      const storage = getStorage(app);
      const fileName = new Date().getTime() + file.name;
      const storageRef = ref(storage, fileName);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        }
      );
    });
  };

  const handleRemoveImage = (index) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, i) => i !== index),
    });
  };

  const handleChange = (e) => {
    if (e.target.id === 'sale' || e.target.id === 'rent') {
      setFormData({
        ...formData,
        type: e.target.id,
      });
    }

    if (
      e.target.id === 'parking' ||
      e.target.id === 'furnished' ||
      e.target.id === 'offer'
    ) {
      setFormData({
        ...formData,
        [e.target.id]: e.target.checked,
      });
    }

    if (
      e.target.type === 'number' ||
      e.target.type === 'text' ||
      e.target.type === 'textarea'
    ) {
      setFormData({
        ...formData,
        [e.target.id]: e.target.value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.imageUrls.length < 1)
        return setError('You must upload at least one image');
      if (+formData.regularPrice < +formData.discountPrice)
        return setError('Discount price must be lower than regular price');
      setLoading(true);
      setError(false);
      const res = await fetch('/api/listing/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          userRef: currentUser._id,
        }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success === false) {
        setError(data.message);
      }
      navigate(`/listing/${data._id}`);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };
  return (
    <main className='p-6 max-w-4xl mx-auto bg-gray-50 rounded-lg shadow-md'>
  <h1 className='text-4xl font-bold text-center mb-8 text-gray-800'>
    Create a Listing
  </h1>
  <form onSubmit={handleSubmit} className='flex flex-col sm:flex-row gap-8'>
    {/* Left Section */}
    <div className='flex flex-col gap-6 flex-1'>
      <input
        type='text'
        placeholder='Name'
        className='border p-4 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
        id='name'
        maxLength='62'
        minLength='10'
        required
        onChange={handleChange}
        value={formData.name}
      />
      <textarea
        placeholder='Description'
        className='border p-4 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
        id='description'
        required
        onChange={handleChange}
        value={formData.description}
        rows='4'
      />
      <input
        type='text'
        placeholder='Address'
        className='border p-4 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
        id='address'
        required
        onChange={handleChange}
        value={formData.address}
      />
      {/* Checkbox Section */}
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-4'>
        {[
          { id: 'sale', label: 'Sell', checked: formData.type === 'sale' },
          { id: 'rent', label: 'Rent', checked: formData.type === 'rent' },
          { id: 'parking', label: 'Parking spot', checked: formData.parking },
          { id: 'furnished', label: 'Furnished', checked: formData.furnished },
          { id: 'offer', label: 'Offer', checked: formData.offer },
        ].map(({ id, label, checked }) => (
          <label key={id} className='flex items-center gap-2 cursor-pointer'>
            <input
              type='checkbox'
              id={id}
              className='w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 rounded'
              onChange={handleChange}
              checked={checked}
            />
            <span className='text-gray-700'>{label}</span>
          </label>
        ))}
      </div>
      {/* Number Inputs */}
      <div className='grid grid-cols-2 gap-4'>
        {[
          { id: 'bedrooms', label: 'Beds', value: formData.bedrooms, min: 1, max: 10 },
          { id: 'bathrooms', label: 'Baths', value: formData.bathrooms, min: 1, max: 10 },
          { id: 'regularPrice', label: 'Regular Price', value: formData.regularPrice, min: 50, max: 10000000 },
          formData.offer && {
            id: 'discountPrice',
            label: 'Discounted Price',
            value: formData.discountPrice,
            min: 0,
            max: 10000000,
          },
        ]
          .filter(Boolean)
          .map(({ id, label, value, min, max }) => (
            <div key={id} className='flex flex-col'>
              <label className='text-gray-700 font-semibold mb-1'>{label}</label>
              <input
                type='number'
                id={id}
                className='border p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
                required
                onChange={handleChange}
                value={value}
                min={min}
                max={max}
              />
            </div>
          ))}
      </div>
    </div>
    {/* Right Section */}
    <div className='flex flex-col gap-6 flex-1'>
      <p className='font-semibold text-gray-700'>
        Images:
        <span className='font-normal text-gray-500 ml-2'>
          The first image will be the cover (max 6)
        </span>
      </p>
      <div className='flex gap-4'>
        <input
          onChange={(e) => setFiles(e.target.files)}
          className='p-3 border border-gray-300 rounded-lg shadow-sm w-full focus:ring-2 focus:ring-blue-500 focus:outline-none'
          type='file'
          id='images'
          accept='image/*'
          multiple
        />
        <button
          type='button'
          disabled={uploading}
          onClick={handleImageSubmit}
          className='p-3 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 disabled:bg-gray-300'
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      <p className='text-red-600 text-sm'>{imageUploadError && imageUploadError}</p>
      {formData.imageUrls.length > 0 &&
        formData.imageUrls.map((url, index) => (
          <div
            key={url}
            className='flex justify-between p-3 border items-center bg-gray-100 rounded-lg shadow-sm'
          >
            <img
              src={url}
              alt='listing image'
              className='w-20 h-20 object-contain rounded-lg'
            />
            <button
              type='button'
              onClick={() => handleRemoveImage(index)}
              className='p-2 bg-red-500 text-white rounded-lg hover:bg-red-600'
            >
              Delete
            </button>
          </div>
        ))}
      <button
        disabled={loading || uploading}
        className='p-4 bg-green-500 text-white rounded-lg uppercase shadow-lg hover:bg-green-600 disabled:opacity-80'
      >
        {loading ? 'Creating...' : 'Create Listing'}
      </button>
      {error && <p className='text-red-600 text-sm'>{error}</p>}
    </div>
  </form>
</main>

  );
}
