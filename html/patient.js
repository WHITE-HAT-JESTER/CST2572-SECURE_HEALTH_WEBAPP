
function openBookingsPopup() {
            const popup = document.getElementById('bookingsPopup');
            popup.classList.add('show');
        }

function closeBookingsPopup() {
            const popup = document.getElementById('bookingsPopup');
            popup.classList.remove('show');
        }

const dialog = document.getElementById("bookingsDialog");

document.getElementById("open").addEventListener("click", () => {
  dialog.showModal();
});

document.getElementById("cancel-booking").addEventListener("click", () => {
  dialog.close();
});