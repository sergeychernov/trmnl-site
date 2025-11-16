"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/plugins", label: "Список плагинов" },
  { href: "/auth", label: "Вход/Выход" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  }

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        backdropFilter: "blur(8px)",
        backgroundColor: (t) => (t.palette.mode === "light" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)"),
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 56, display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Button
              component={Link}
              href="/"
              color="inherit"
              sx={{ px: 0, minWidth: "auto", display: "flex", alignItems: "center", gap: 1 }}
            >
              <Image src="/logo.svg" alt="TRMNL" width={28} height={28} priority style={{ width: 28, height: 28 }} />
              <Typography variant="subtitle1" sx={{ display: { xs: "none", sm: "inline" }, fontWeight: 600 }}>
                TRMNL
              </Typography>
            </Button>
          </Box>

          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
            {navItems.map((item) => {
              const href = item.href === "/auth" ? (session ? "/profile" : "/auth") : item.href;
              const active = isActive(href);
              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={href}
                  size="small"
                  color="inherit"
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    bgcolor: active ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                    textTransform: "none",
                  }}
                >
                  {item.href === "/auth" ? (session ? "Профиль" : "Вход") : item.label}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton
              aria-label="Открыть меню"
              onClick={() => setOpen((v) => !v)}
              size="small"
              color="inherit"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      <Drawer
        anchor="top"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { pt: 1, pb: 2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 } }}
      >
        <Container maxWidth="lg">
          <List sx={{ py: 0 }}>
            {navItems.map((item) => {
              const href = item.href === "/auth" ? (session ? "/profile" : "/auth") : item.href;
              const active = isActive(href);
              return (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  href={href}
                  selected={!!active}
                  onClick={() => setOpen(false)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemText
                    primary={
                      item.href === "/auth" ? (session ? "Профиль" : "Вход") : item.label
                    }
                    primaryTypographyProps={{ fontSize: 14 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Container>
      </Drawer>
    </AppBar>
  );
}


